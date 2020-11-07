<template>
<div v-if="ok">
    <div class="text-h4">{{ titre }}</div>
    <div v-if="image !== null" class="img bg-grey-2"><img class="img" :src="image"/></div>
    <div v-for="a in attributs" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
      <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
    </div>

    <q-toggle v-model="voirtoutes" class="text-h5 text-italic" left-label :label="voirtoutes ? 'Cacher les propriétés détailles' : 'Voir les propriétés détailles'"/>
    <q-scroll-area v-if="voirtoutes" class="qsa q-mt-lg q-pa-md">
    <div v-for="a in tousAttributs" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
      <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
    </div>
    </q-scroll-area>
</div>
</template>

<script>
import { dec, codeCourtDeId } from '../app/global.js'

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
  { n: 'code-barre', c: 'barcode' },
  { n: 'prix d\'achat HT', c: 'base_price', f: 'd4' },
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

function edit (v, f, a) {
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
  }
  return v
}

export default {
  name: 'FicheArticle',
  components: { },
  props: ['monArticle'],
  data () {
    return {
      ok: false,
      voirtoutes: false,
      attributs: [],
      tousAttributs: [],
      fournisseur: '',
      image: null,
      titre: ''
    }
  },
  mounted () {
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
    }
  },
  methods: {
    chgArticle (a) {
      const x = []
      for (let i = 0; i < champs.length; i++) {
        const y = champs[i]
        const ved = y.f ? edit(a[y.c], y.f, a) : a[y.c]
        x.push({ c: y.n, v: ved, b: true })
      }
      this.attributs = x
      const x2 = []
      for (const c in a) {
        x2.push({ c: c, v: ('' + a[c]).substring(0, 80) })
      }
      x2.sort((a, b) => a.c < b.c ? -1 : (a.c === b.c ? 0 : 1))
      this.tousAttributs = x2
      this.nom = a.display_name
      this.fournisseur = a.default_seller_id[1].substring(0, 3)
      this.image = a.image ? 'data:image/jpg;base64,' + a.image : null
      this.titre = this.fournisseur + ' - ' + this.nom +
        (a.sale_ok && a.available_in_pos ? ' - passe en caisse' : ' - NE passe PAS en caisse') +
        (a.to_weight ? ' - à peser [' + a.codecourt + ']' : '')
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
