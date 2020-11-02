<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un PO</div>
  <div class="row items-center">
    <q-input v-model="po" bottom-slots style="width:10rem" dense label="Numéro de PO" >
      <template v-slot:hint>
        De 1 à 5 chiffres
      </template>
    </q-input>
    <q-btn class="q-mx-lg" icon-right="search" color="primary" label="Rechercher" @click="recherche" />
  </div>
  <div v-if="chargt" class="text-h5 text-italic text-bold">Recherche en cours ...</div>
  <div v-if="!chargt && entete === null" class="text-h5 text-italic text-bold">Pas de PO ayant ce numéro</div>
  <div v-if="!chargt && entete != null">
    <div class='text-h4 q-my-lg'>{{ titre }}</div>
    <div v-for="a in props" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
      <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
    </div>
    <q-toggle v-model="voirtoutes" label="Toutes les propriétés" />
    <div v-if="voirtoutes">
      <div v-for="a in props2" :key="a.c" class="row">
        <div class="champ">{{ a.c }}
          <q-tooltip>{{ a.c }}</q-tooltip>
        </div>
        <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
      </div>
    </div>
    <div class="row q-my-md items-center">
      <q-input class="q-mr-lg" v-model="filtre" bottom-slots style="width:15em" dense label="Filtre sur nom" >
        <template v-slot:hint>
          quelques lettres
        </template>
      </q-input>
      <div>{{ data2.length }} ligne(s)</div>
    </div>
    <q-table
      class="my-sticky-header-column-table"
      :data="data2"
      :columns="columns"
      row-key="idx"
      :pagination.sync="pagination"
      hide-pagination>
      <template v-slot:body-cell-nom="props">
        <q-td :props="props">
          <div @click="clicLigne(props.row)" class="cursor-pointer">{{ props.row.nom }}
            <q-tooltip>{{ props.row.dates }}</q-tooltip>
          </div>
        </q-td>
      </template>
      <template v-slot:body-cell-package_qty="props">
        <q-td :props="props">
          <div :class="props.row.indicative_package ? '' : 'text-red text-bold'">{{ props.row.package_qty }}
            <q-tooltip>{{ props.row.indicative_package ? 'indicatif' : 'OBLIGATOIRE' }}</q-tooltip>
          </div>
        </q-td>
      </template>
     </q-table>
  </div>

</div>
</template>

<script>
import { global, post } from '../app/global.js'
import { remove } from '../app/accents.js'

// eslint-disable-next-line
const champsPO = ['id', 'name', 'origin', 'partner_ref', 'date_order', 'date_approve', 'partner_id', 'dest_address_id', 'currency_id', 'state', 'order_line', 'notes', 'invoice_count', 'invoice_ids', 'invoice_status', 'amount_untaxed', 'amount_tax', 'amount_total', 'fiscal_position_id', 'payment_term_id', 'user_id', 'company_id', 'incoterm_id', 'picking_count', 'picking_ids', 'picking_type_id', 'group_id', 'date_planned', 'activity_ids', 'message_follower_ids', 'message_ids', 'message_main_attachment_id', 'website_message_ids', 'access_token', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_id', 'default_location_dest_id_usage', 'is_shipped', 'activity_state', 'activity_user_id', 'activity_type_id', 'activity_date_deadline', 'activity_summary', 'message_is_follower', 'message_partner_ids', 'message_channel_ids', 'message_unread', 'message_unread_counter', 'message_needaction', 'message_needaction_counter', 'message_has_error', 'message_has_error_counter', 'message_attachment_count', 'access_url', 'access_warning', 'display_name', '__last_update']
// eslint-disable-next-line
const champsLG = ['id', 'name', 'sequence', 'product_uom_qty', 'date_planned', 'taxes_id', 'product_uom', 'product_id', 'price_unit', 'price_subtotal', 'price_total', 'price_tax', 'order_id', 'account_analytic_id', 'analytic_tag_ids', 'company_id', 'state', 'invoice_lines', 'qty_invoiced', 'qty_received', 'partner_id', 'currency_id', 'move_ids', 'orderpoint_id', 'move_dest_ids', 'discount', 'sale_order_id', 'sale_line_id', 'package_qty', 'indicative_package', 'product_qty_package', 'product_qty', 'price_policy', 'operation_extra_id', 'price_unit_tax', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_image', 'product_type', 'date_order', 'unit_price', 'package_price', 'display_name', '__last_update']

const champsLGS = ['id', 'taxes_id', 'product_uom', 'product_id', 'price_unit', 'price_subtotal', 'price_total', 'price_tax', 'state', 'qty_invoiced', 'qty_received', 'discount', 'package_qty', 'indicative_package', 'product_qty_package', 'product_qty', 'price_unit_tax', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_type', 'unit_price', 'package_price', '__last_update']

const champs = [
  { n: 'livraison prévue', c: 'date_planned', f: 'dc' },
  { n: 'montants', c: 'amount_untaxed', f: 'montant' },
  { n: 'montants remisés', c: 'amount_untaxed_r', f: 'montantr' },
  { n: 'date de commande', c: 'date_order' },
  { n: 'création', c: 'create_date', f: 'cr' },
  { n: 'dernière mise à jour', c: 'write_date', f: 'maj' }
]

const columns = [
  {
    name: 'nom',
    label: 'nom',
    align: 'left',
    field: 'nom',
    sortable: true,
    sort: (a, b, rowA, rowB) => rowA.nom < rowB.nom ? 1 : (rowA.nom === rowB.nom ? 0 : -1)
  },
  { name: 'idx', label: '#', align: 'center', field: 'idx', sortable: true },
  { name: 'kg', label: 'U/kg', align: 'center', field: 'kg' },
  { name: 'package_qty', label: 'colisage', align: 'center', field: 'package_qty' },
  { name: 'product_qty_package', label: 'nb colis', align: 'center', field: 'product_qty_package' },
  { name: 'product_qty', label: 'quantité', align: 'center', field: 'product_qty', format: (val, row) => ednbkg(val, row) },
  { name: 'qty_received', label: 'reçue', align: 'center', field: 'qty_received', format: (val, row) => ednbkg(val, row) },
  { name: 'price_unit', align: 'center', label: 'PU', field: 'price_unit', format: val => dec(val, 4) },
  { name: 'tva', align: 'center', label: 'TVA', field: 'tva' },
  { name: 'price_subtotal_r', align: 'right', label: 'HT', field: 'price_subtotal_r', format: val => dec(val, 2) },
  { name: 'price_total_r', align: 'right', label: 'TTC', field: 'price_total_r', format: val => dec(val, 2) },
  { name: 'discount', align: 'center', label: 'remise', field: 'discount', format: val => !val ? '' : (val + '%') }
]

function ednbkg (v, r) {
  if (r.kg !== 'kg') return '' + v + ' pièces'
  return dec(v, 3) + ' kg'
}

function dec (v, n) {
  let x = '' + Math.round(v * [1, 10, 100, 1000, 10000, 100000][n])
  if (x.length <= n) x = '000000'.substring(0, n - x.length + 1) + x
  return x.substring(0, x.length - n) + ',' + x.substring(x.length - n)
}

export default {
  name: 'PurchaseOrder',
  components: { },
  data () {
    return {
      po: '',
      titre: '',
      props: [],
      props2: [],
      entete: null,
      voirtoutes: false,
      chargt: false,
      liste: [],
      data2: null,
      data1: null,
      columns: columns,
      pagination: { rowsPerPage: 500 },
      filtre: '',
      article: null
    }
  },
  mounted () {
  },
  computed: {
  },
  watch: {
    filtre (val) {
      if (!val) {
        this.data2 = this.data1return
      }
      const s = remove(val).toLowerCase()
      const x = []
      for (let i = 0; i < this.data1.length; i++) {
        const r = this.data1[i]
        if (r.nomx.indexOf(s) !== -1) x.push(r)
      }
      this.data2 = x
    }
  },
  methods: {
    async clicLigne (l) {
      console.log(l.idx + ' ' + l.nom)
      await this.getArticle(l.product_id[0])
      // this.logfields(this.article, 'champsPR')
    },
    dec (v, n) {
      let x = '' + Math.round(v * [1, 10, 100, 1000, 10000, 100000][n])
      if (x.length <= n) x = '000000'.substring(0, n - x.length + 1) + x
      return x.substring(0, x.length - n) + ',' + x.substring(x.length - n)
    },
    taxe_achat (id) {
      const n = id && id.length > 0 ? id[0] : 0
      return global.config.taxe_achat && global.config.taxe_achat[n] ? global.config.taxe_achat[n] : 0
    },
    uom (x) {
      return x && x.length === 2 && x[1] === 'kg' ? 'kg' : 'U'
    },
    logfields (o, n) {
      const x = []
      for (const f in o) x.push('\'' + f + '\'')
      console.log('const ' + n + ' = [' + x.join(', ') + ']')
    },
    async getArticle (a) {
      const params = {
        ids: [a],
        domain: [],
        fields: null,
        order: '',
        limit: 1,
        offset: 0
      }
      this.article = null
      const lst = await post('m1/get_by_ids', { model: 'product.product', params: params, timeout: 20000 })
      console.log('nb de lignes : ' + lst.length)
      if (lst[0]) {
        this.article = lst[0]
        console.log(JSON.stringify(this.article))
      }
    },
    async recherche () {
      this.chargt = true
      global.App.opStart()
      try {
        const params = {
          ids: [parseInt(this.po, 10)],
          domain: [],
          // fields: fields, // omettre cette ligne pour avoir TOUS les champs
          order: '',
          limit: 3,
          offset: 0
        }
        this.entete = null
        this.liste = await post('m1/get_by_ids', { model: 'purchase.order', params: params, timeout: 20000 })
        console.log('nb de PO : ' + this.liste.length)
        if (this.liste.length) {
          this.entete = this.liste[0]
          const e = this.entete
          // this.logfields(e, 'champsPO')
          // console.log(JSON.stringify(e))
          const l = this.entete.order_line
          if (l && l.length) {
            this.data1 = await this.getLignes(l)
          } else {
            this.data1 = []
          }
          this.data2 = this.data1
          this.affichePO(e)
        }
      } catch (e) {
        console.log(e.message)
      }
      this.chargt = false
      global.App.opComplete()
    },
    affichePO (a) {
      const e = this.entete
      this.titre = e.display_name + ' (' + e.state + ' ) - ' + this.edit(e.partner_id, 'fourn')
      this.props = []
      for (let i = 0; i < champs.length; i++) {
        const y = champs[i]
        const ved = y.f ? this.edit(a[y.c], y.f, a) : a[y.c]
        this.props.push({ c: y.n, v: ved, b: true })
      }
      this.props2 = []
      for (const c in a) {
        this.props2.push({ c: c, v: a[c] })
      }
      this.props2.sort((a, b) => a.c < b.c ? -1 : (a.c === b.c ? 0 : 1))
    },
    async getLignes (l) {
      const params = {
        ids: l,
        domain: [],
        fields: champsLGS,
        order: '',
        limit: 300,
        offset: 0
      }
      const lst = await post('m1/get_by_ids', { model: 'purchase.order.line', params: params, timeout: 20000 })
      console.log('nb de lignes : ' + lst.length)

      const e = this.entete
      e.amount_untaxed_r = 0
      e.amount_tax_r = 0
      e.amount_total_r = 0
      e.aremises = false

      if (lst.length) {
        for (let i = 0; i < lst.length; i++) {
          const lg = lst[i]
          lg.idx = i + 1
          const d = 1 + (lg.discount / 100)
          if (lg.discount !== 0) e.aremises = true
          lg.price_subtotal_r = lg.price_subtotal * d
          e.amount_untaxed_r += lg.price_subtotal_r
          lg.price_tax_r = lg.price_tax * d
          e.amount_tax_r += lg.price_tax_r
          lg.price_total_r = lg.price_total * d
          e.amount_total_r += lg.price_total_r
          lg.tva = this.taxe_achat(lg.taxes_id)
          lg.kg = this.uom(lg.product_uom)
          lg.nom = lg.product_id[1]
          lg.nomx = remove(lg.nom).toLowerCase()
          lg.dates = 'Maj le ' + lg.write_date + ' par ' + lg.write_uid[1] + ' - Création le ' + lg.create_date + ' par ' + lg.create_uid[1]
          console.log(JSON.stringify(lg))
        }
        return lst
      }
      // console.log(JSON.stringify(this.lignes))
    },
    edit (v, f, a) {
      switch (f) {
        case 'bool': {
          return v ? 'oui' : 'non'
        }
        case 'id': {
          return v[1]
        }
        case 'montant': {
          return this.dec(a.amount_untaxed, 2) + '€ + ' + this.dec(a.amount_tax, 2) + '€ = ' + this.dec(a.amount_total, 2) + '€'
        }
        case 'montantr': {
          return !a.aremises ? '' : (this.dec(a.amount_untaxed_r, 2) + '€ + ' + this.dec(a.amount_tax_r, 2) + '€ = ' + this.dec(a.amount_total_r, 2) + '€')
        }
        case 'fourn': {
          this.fournisseur = v[1].substring(0, 3)
          return v[1]
        }
        case 'd2' : {
          return this.dec(v, 2)
        }
        case 'd4' : {
          return this.dec(v, 4)
        }
        case 'lignes' : {
          this.lignes = v
          return v.length
        }
        case 'dc' : {
          return v ? v.substring(0, 10) : ''
        }
        case 'cr' : {
          return v ? (v + ' par ' + a.create_uid[1]) : ''
        }
        case 'maj' : {
          return v ? (v + ' par ' + a.write_uid[1]) : ''
        }
      }
      return v
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

.champ
  width: 16rem
  overflow: hidden
  text-overflow: ellipsis

.my-sticky-header-column-table
  /* height or max-height is important */
  height: 310px

  /* specifying max-width so the example can
    highlight the sticky column on any browser window */
  /* max-width: 600px */

  td:first-child
    /* bg color is important for td; just specify one */
    background-color: #c1f4cd !important

  tr th
    position: sticky
    /* higher than z-index for td below */
    z-index: 2
    /* bg color is important; just specify one */
    background: #fff

  /* this will be the loading indicator */
  thead tr:last-child th
    /* height of all previous header rows */
    top: 48px
    /* highest z-index */
    z-index: 3
  thead tr:first-child th
    top: 0
    z-index: 1
  tr:first-child th:first-child
    /* highest z-index */
    z-index: 3

  td:first-child
    z-index: 1

  td:first-child, th:first-child
    position: sticky
    left: 0

</style>
