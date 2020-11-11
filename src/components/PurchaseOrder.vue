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
          <div @click="clicLigne(props.row)" class="cursor-pointer my-table-details">{{ props.row.nom }}
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
     <q-space />
  </div>

  <div v-if="!chargt && entete != null">
    <q-toggle v-model="voirtoutes" class="text-h5 text-italic" left-label :label="voirtoutes ? 'Cacher les propriétés détailles' : 'Voir les propriétés détailles'"/>
    <q-input v-if="voirtoutes" class="q-mr-lg" v-model="filtre2" bottom-slots style="width:15em" dense label="Filtre sur le nom de propriété" >
      <template v-slot:hint>
        quelques lettres
      </template>
    </q-input>
    <q-scroll-area v-if="voirtoutes" class="qsa q-mt-sm q-pa-sm">
      <div v-for="a in props3" :key="a.c" class="row">
        <div class="champ">{{ a.c }}
          <q-tooltip>{{ a.c }}</q-tooltip>
        </div>
        <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
      </div>
    </q-scroll-area>
  </div>

  <q-dialog v-model="voirArticle" full-width>
    <q-layout view="Lhh lpR fff" container class="bg-white">
      <q-header class="bg-primary">
        <q-toolbar>
          <q-toolbar-title>{{ nom }}</q-toolbar-title>
          <q-btn flat v-close-popup round dense icon="close" />
        </q-toolbar>
      </q-header>

      <q-page-container>
        <q-page padding>
          <fiche-article :mon-article="article"></fiche-article>
        </q-page>
      </q-page-container>
    </q-layout>
  </q-dialog>

</div>
</template>

<script>
import { global, dec } from '../app/global.js'
import { productById, orderlines, purchaseOrderById, setSupplierinfo } from '../app/reqOdoo.js'
import { remove } from '../app/accents.js'
import FicheArticle from './FicheArticle.vue'

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
    voirtoutes: false,
    label: 'nom',
    align: 'left',
    field: 'nom',
    classes: 'bg-grey-2 ellipsis',
    style: 'max-width: 180px',
    headerClasses: 'bg-primary text-white',
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

export default {
  name: 'PurchaseOrder',

  components: { FicheArticle },

  data () {
    return {
      po: '',
      titre: '',
      props: [],
      props2: [],
      props3: [],
      entete: null,
      voirtoutes: false,
      chargt: false,
      liste: [],
      data2: null,
      data1: null,
      columns: columns,
      pagination: { rowsPerPage: 500 },
      filtre: '',
      filtre2: '',
      article: null,
      fournisseur: '',
      nom: '',
      voirArticle: false
    }
  },

  mounted () {
  },

  computed: {
  },

  watch: {
    filtre2 () { this.filtrer2() },
    filtre () { this.filtrer() }
  },

  methods: {
    filtrer2 () {
      if (!this.filtre2) {
        this.props3 = this.props2
      } else {
        const x = []
        for (let i = 0; i < this.props2.length; i++) {
          const a = this.props2[i]
          if (a.c.indexOf(this.filtre2) !== -1) x.push(a)
        }
        this.props3 = x
      }
    },

    filtrer () {
      if (!this.filtre) {
        this.data2 = this.data1
      } else {
        const s = remove(this.filtre).toLowerCase()
        const x = []
        for (let i = 0; i < this.data1.length; i++) {
          const r = this.data1[i]
          if (r.nomx.indexOf(s) !== -1) x.push(r)
        }
        this.data2 = x
      }
    },

    async clicLigne (l) {
      const a = await productById(l.product_id[0])
      if (a) {
        await setSupplierinfo(a)
        this.nom = l.nom
        this.voirArticle = true
        await this.$nextTick() // sinon l'attribut monArticle ne déclenche pas le watch
        this.article = a
      }
    },

    async recherche () {
      this.chargt = true
      global.App.opStart()
      try {
        const e = await purchaseOrderById(parseInt(this.po, 10))
        if (e) {
          const l = e.order_line
          if (l && l.length) {
            this.data1 = await this.getLignes(e, l)
          } else {
            this.data1 = []
          }
          this.data2 = this.data1
          this.titre = e.display_name + ' (' + e.state + ' ) - ' + this.edit(e.partner_id, 'fourn')
          this.props = []
          for (let i = 0; i < champs.length; i++) {
            const y = champs[i]
            const ved = y.f ? this.edit(e[y.c], y.f, e) : e[y.c]
            this.props.push({ c: y.n, v: ved, b: true })
          }
          this.props2 = []
          for (const c in e) this.props2.push({ c: c, v: e[c] })
          this.props3 = this.props2
          this.entete = e
        } else {
          this.entete = null
        }
      } catch (e) {
        console.log(e.message)
      }
      this.chargt = false
      global.App.opComplete()
    },

    async getLignes (e, l) {
      const res = await orderlines(l, champsLGS)
      // return { lines: [], amount_untaxed_r: 0, amount_tax_r: 0, amount_total_r: 0, aremises: false }
      e.amount_untaxed_r = res ? res.amount_untaxed_r : 0
      e.amount_tax_r = res ? res.amount_tax_r : 0
      e.amount_total_r = res ? res.amount_total_r : 0
      e.aremises = res ? res.aremises : false
      return res ? res.lines : []
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
          return dec(a.amount_untaxed, 2) + '€ + ' + dec(a.amount_tax, 2) + '€ = ' + dec(a.amount_total, 2) + '€'
        }
        case 'montantr': {
          return !a.aremises ? '' : (dec(a.amount_untaxed_r, 2) + '€ + ' + dec(a.amount_tax_r, 2) + '€ = ' + dec(a.amount_total_r, 2) + '€')
        }
        case 'fourn': {
          this.fournisseur = v[1].substring(0, 3)
          return v[1]
        }
        case 'd2' : {
          return dec(v, 2)
        }
        case 'd4' : {
          return dec(v, 4)
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

.my-table-details
  font-size: 1.1em
  font-style: italic
  min-width: 180px
  max-width: 300px
  white-space: normal
  paddin-left: 3px
  color: $indigo-8
  font-weight: bold

.my-sticky-header-column-table
  /* height or max-height is important */
  height: 310px

  /* specifying max-width so the example can
    highlight the sticky column on any browser window */
  /* max-width: 600px */

  td:first-child
    /* bg color is important for td; just specify one */
    background-color: $grey-2 !important

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
