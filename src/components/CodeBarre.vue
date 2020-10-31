<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un article</div>
  <input-barcode class="q-ma-md" show v-on:cb-change="cbchange" ></input-barcode>
  <div class="q-ma-md">
    <q-btn icon="print" label="Planche de code-barre" @click="imprcbouvert = true" :disable="codebarre == '' || article === null" />
  </div>
  <div  class="q-ma-md" v-if="article !== null">
    <div class="text-h4">{{ titre }}</div>
    <div v-if="image !== null" class="img bg-grey-2"><img class="img" :src="image"/></div>
    <div v-else class="text-h6">Pas d'image</div>
    <div v-for="a in article" :key="a.c" class="row">
      <div style="width:15rem">{{ a.c }}</div>
      <div :class="'col' + (a.b ? ' text-weight-bolder' : '')">{{ a.v }}</div>
    </div>
  </div>
  <div class="text-h4" v-if="article == null && !chargt && codebarre">Pas d'article avec ce code-bare</div>
  <div class="text-h5 text-italic" v-if="chargt">Recherche en cours ...e</div>

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
import { global, post, codeCourtDeId } from '../app/global.js'
import InputBarcode from './InputBarcode.vue'
import { jsPDF } from 'jspdf'

function dec (v, n) {
  v = '' + v
  const i = v.lastIndexOf('.')
  if (i === -1) return v
  const e = v.substring(0, i + 1)
  const d = v.substring(i + 1) + '00000000'
  return e + d.substring(0, n)
}

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
  name: 'CodeBarre',
  components: { InputBarcode },
  data () {
    return {
      imprcbouvert: false,
      codebarre: '',
      etiq: '',
      etiqs: [],
      fournisseur: '',
      nom: '',
      image: null,
      erreur: null,
      titre: '',
      chargt: false,
      article: null
    }
  },
  mounted () {
    const t = []
    for (const e in global.config.etiquettes) t.push(e)
    this.etiqs = t
    this.etiq = this.etiqs[0]
  },
  methods: {
    async cbchange (event) {
      if (event.err) {
        this.codebarre = ''
        this.article = null
      } else {
        this.codebarre = event.codebarre
        this.codebarreURL = event.dataURL
        await this.getArticle()
      }
    },
    async imprimer () {
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
            doc.addImage(this.codebarreURL, 'JPEG', x1, y1, cfg.cbl, cfg.dy - 2, 'IMG1', 'NONE', 0)
          }
        }

        const label = this.fourn + ' - ' + this.codebarre + ' - ' + this.nom
        doc.text(label, cfg.g, 290)

        const blob = doc.output('blob')
        const url = URL.createObjectURL(blob)
        window.open(url)
      } catch (e) {
        console.log(e.message)
      }
      global.App.opComplete()
    },
    async getArticle () {
      global.App.opStart()
      this.chargt = true
      try {
        const params = { // paramètres requis pour le search_read de articles à peser
          ids: [],
          domain: [['barcode', '=', this.codebarre]],
          // fields: fields, // omettre cette ligne pour avoir TOUS les champs
          order: '',
          limit: 9999,
          offset: 0
        }
        const articles = await post('m1/search_read', { model: 'product.product', params: params, timeout: 10000 })
        console.log(JSON.stringify(articles))
        const x = []
        if (articles.length) {
          const a = articles[0]
          for (let i = 0; i < champs.length; i++) {
            const y = champs[i]
            const ved = y.f ? this.edit(a[y.c], y.f, a) : a[y.c]
            x.push({ c: y.n, v: ved, b: true })
          }
          x.push({ c: '_________________________', v: '_________________________' })
          x.push({ c: 'Toutes les propriétés', v: '' })
          const x2 = []
          for (const c in a) {
            x2.push({ c: c, v: a[c] })
          }
          x2.sort((a, b) => a.c < b.c ? -1 : (a.c === b.c ? 0 : 1))
          this.article = x.concat(x2)
          this.nom = a.display_name
          this.image = a.image ? 'data:image/jpg;base64,' + a.image : null
          this.titre = this.fournisseur + ' - ' + this.nom +
           (a.sale_ok && a.available_in_pos ? ' - passe en caisse' : 'NE passe PAS en caisse') +
           (a.to_weight ? ' - à peser [' + a.codecourt + ']' : '')
        } else {
          this.article = null
        }
      } catch (e) { }
      this.chargt = false
      global.App.opComplete()
    },
    edit (v, f, a) {
      switch (f) {
        case 'bool': {
          return v ? 'oui' : 'non'
        }
        case 'id': {
          return v[1]
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
        case 'court' : {
          if (!v) return 'non'
          a.codecourt = codeCourtDeId(a.id, a.display_name)
          return 'oui - [' + a.codecourt + ']'
        }
      }
      return v
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'
.img
  width: 128px
  height: 128px
</style>
