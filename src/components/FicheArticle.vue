<template>
<div v-if="ok">
    <div class="text-h4">{{ titre }}</div>
    <div class="q-my-md row items-center">
      <img class="q-mr-lg" style="width:15rem" :src="cbimage"/>
      <q-btn icon="print" label="Planche de code-barre" @click="imprcbouvert = true"/>
    </div>

    <div v-if="image !== null" class="img bg-grey-2"><img class="img" :src="image"/></div>
    <div v-for="a in attributs" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
      <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
    </div>

    <q-markup-table v-if="monArticle.supplierinfo.length > 1">
      <thead>
        <tr>
          <th v-for="(c, index1) in champsSIN" :key="index1"  class="text-left">{{ c }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(a, index) in monArticle.supplierinfo" :key="index">
          <td v-for="(c, index3) in champsSI" :key="index3" class="text-left">{{ edit(a[c], 'simple') }}</td>
        </tr>
      </tbody>
    </q-markup-table>

    <q-toggle v-model="voirtoutes" class="text-h5 text-italic" left-label :label="voirtoutes ? 'Cacher les propriétés détailles' : 'Voir les propriétés détailles'"/>
    <q-input v-if="voirtoutes" class="q-mr-lg" v-model="filtre" bottom-slots style="width:15em" dense label="Filtre sur le nom de propriété" >
      <template v-slot:hint>
        quelques lettres
      </template>
    </q-input>
    <q-scroll-area v-if="voirtoutes" class="qsa q-mt-lg q-pa-md">
    <div v-for="a in tousAttributs2" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
      <div class="col">{{ a.v }}</div>
    </div>
    </q-scroll-area>

    <q-dialog v-model="imprcbouvert">
      <q-card>
        <q-card-section>
          <div class="text-h5">Options d'impression pour l'imprimante : "recto", "100%", les étiquettes décollables sur la face vers le bas dans le tiroir de l'imprimante</div>
          <q-select class="col q-mt-lg" v-model="etiq" :options="etiqs" label="Modèle d'étiquettes" style="width:10rem"/>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" color="negative" v-close-popup />
          <q-btn flat icon="print" label="IMPRIMER EN PDF" @click="imprimer" color="primary" v-close-popup />
        </q-card-actions>
    </q-card>
  </q-dialog>
</div>
</template>

<script>
import { global, dec, codeCourtDeId, toBase64Barcode } from '../app/global.js'
import { jsPDF } from 'jspdf'

const champsSI = ['name', 'product_code', 'price', 'discount', 'package_qty']
const champsSIN = ['fournisseur', 'code fournisseur', 'coût', 'remise', 'colisage']

const champs = [
  { n: 'nom', c: 'display_name' },
  { n: 'fournisseur', c: 'default_seller_id', f: 'fourn' },
  { n: 'catégorie', c: 'categ_id', f: 'id' },
  { n: 'identifiant', c: 'id' },
  { n: 'actif', c: 'active', f: 'bool' },
  { n: 'peut être acheté', c: 'purchase_ok', f: 'bool' },
  { n: 'peut être vendu', c: 'sale_ok', f: 'bool' },
  { n: 'disponible dans le PDV', c: 'available_in_pos', f: 'bool' },
  { n: 'unité ou kg', c: 'uom_name' },
  { n: 'à peser', c: 'to_weight', f: 'court' },
  { n: 'prix d\'achat HT', c: 'base_price', f: 'd4' },
  { n: 'code-barre', c: 'barcode' },
  { n: 'code fournisseur', c: 'product_code' },
  { n: 'prix de vente', c: 'list_price', f: 'd2' },
  { n: 'tva', c: 'fiscal_classification_id', f: 'id' },
  { n: 'colisage', c: 'default_packaging' },
  { n: 'quantité disponible', c: 'qty_available' },
  { n: 'valeur du stock', c: 'stock_value', f: 'd2' },
  { n: 'conso. moyenne', c: 'average_consumption', f: 'd4' },
  { n: 'producteur', c: 'pricetag_origin' },
  { n: 'volume en L', c: 'volume' },
  { n: 'poids en Kg', c: 'weight' },
  { n: 'date de création', c: 'create_date' },
  { n: 'date d\'écriture', c: 'write_date' }
]

export default {
  name: 'FicheArticle',
  components: { },
  props: ['monArticle'],
  data () {
    return {
      ok: false,
      imprcbouvert: false,
      etiq: '',
      etiqs: [],
      voirtoutes: false,
      attributs: [],
      tousAttributs: [],
      tousAttributs2: [],
      fournisseur: '',
      image: null,
      cbimage: null,
      filtre: '',
      titre: '',
      champsSI: champsSI,
      champsSIN: champsSIN
    }
  },
  mounted () {
    const t = []
    for (const e in global.config.etiquettes) t.push(e)
    this.etiqs = t
    this.etiq = this.etiqs[0]
  },
  computed: {
  },
  watch: {
    'monArticle' (newval) {
      console.log('Dans FicheArticle New val: ' + JSON.stringify(newval).substring(0, 50))
      if (newval) {
        this.chgArticle(newval)
        this.ok = true
      } else {
        this.ok = false
      }
    },
    filtre () {
      this.filtrer()
    }
  },
  methods: {
    filtrer () {
      if (!this.filtre) {
        this.tousAttributs2 = this.tousAttributs
      } else {
        const x = []
        for (let i = 0; i < this.tousAttributs.length; i++) {
          const a = this.tousAttributs[i]
          if (a.c.indexOf(this.filtre) !== -1) x.push(a)
        }
        this.tousAttributs2 = x
      }
    },

    chgArticle (a) {
      const x = []
      for (let i = 0; i < champs.length; i++) {
        const y = champs[i]
        const ved = y.f ? this.edit(a[y.c], y.f, a) : a[y.c]
        x.push({ c: y.n, v: ved, b: true })
      }
      this.attributs = x
      const x2 = []
      for (const c in a) x2.push({ c: c, v: this.edit(a[c], 'json') })
      this.tousAttributs = x2
      this.tousAttributs2 = x2
      this.filtrer()
      this.nom = a.display_name
      this.fournisseur = a.default_seller_id[1].substring(0, 3)
      this.codebarre = a.barcode
      this.cbimage = toBase64Barcode(a.barcode)
      this.image = a.image ? 'data:image/jpg;base64,' + a.image : null
      this.titre = this.fournisseur + ' - ' + this.nom +
        (a.sale_ok && a.available_in_pos ? ' - passe en caisse' : ' - NE passe PAS en caisse') +
        (a.to_weight ? ' - à peser [' + a.codecourt + ']' : '')
    },

    imprimer () {
      global.App.opStart()
      const cfg = global.config.etiquettes[this.etiq]
      try {
        // eslint-disable-next-line
        const doc = new jsPDF()
        doc.setFont('fixed')
        doc.setFontSize(9)

        for (let i = 0; i < cfg.nx; i++) {
          for (let j = 0; j < cfg.ny; j++) {
            const x1 = cfg.g + (i * cfg.dx) - 2
            const y1 = cfg.h + (j * cfg.dy) + 2
            doc.addImage(this.cbimage, 'JPEG', x1, y1, cfg.cbl, cfg.dy - 2, 'IMG1', 'NONE', 0)
          }
        }

        const label = this.fournisseur + ' - ' + this.codebarre + ' - ' + this.nom
        doc.text(label, cfg.g, 290)

        const blob = doc.output('blob')
        const url = URL.createObjectURL(blob)
        window.open(url)
      } catch (e) {
        console.log(e.message)
      }
      global.App.opComplete()
    },

    edit (v, f, a) {
      switch (f) {
        case 'bool': { return v ? 'oui' : 'non' }
        case 'id': { return v[1] }
        case 'fourn': { return v[1] }
        case 'd2' : { return dec(v, 2) }
        case 'd4' : { return dec(v, 4) }
        case 'court' : {
          if (!v) return 'non'
          a.codecourt = codeCourtDeId(a.id, a.display_name)
          return 'oui - [' + a.codecourt + ']'
        }
        case 'json' : {
          return JSON.stringify(v, null, 2).substring(0, 500)
        }
        case 'simple' : {
          return Array.isArray(v) && v.length === 2 ? v[1] : (v ? '' + v : '')
        }
      }
      return ('' + v).substring(0, 80)
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

.img
  width: 128px
  height: 128px

.champ
  width: 16rem
  overflow: hidden
  text-overflow: ellipsis

.qsa
    height: 250px
    border: 2px solid $grey-6
    color: $indigo-8

</style>
