<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un article</div>
  <input-barcode class="q-ma-md" show v-on:cb-change="cbchange" ></input-barcode>
  <q-select  class="q-ma-md col q-mt-lg" v-model="option" :options="optionsrecherche" label="Options de recherche" style="width:20rem"/>
  <q-btn v-if="optionsrecherche[0] !== option" class="q-ma-md" icon="print" label="Rechercher" @click="recherche" :disable="codebarre == ''" />
  <div class="q-ma-md">
    <q-btn icon="print" label="Planche de code-barre" @click="imprcbouvert = true" :disable="codebarre == '' || article === null" />
  </div>
  <div class="q-ma-md row items-center" v-if="liste.length > 1">
    <q-btn icon="skip_previous" size="sm" label="Précédent" @click="courant = courant - 1;afficheArticle()" :disable="courant === 0" />
    <div class="q-mx-lg">{{ courant + 1 }} / {{ liste.length }}</div>
    <q-btn icon-right="skip_next" size="sm" label="Suivant" @click="courant = courant + 1;afficheArticle()" :disable="courant === liste.length - 1" />
    <q-btn icon="view_list" size="sm" label="Voir la liste" @click="aliste = true" />
  </div>
  <div  class="q-ma-md" v-if="article !== null">
    <div class="text-h4">{{ titre }}</div>
    <div class="text-h4 text-red-5" v-if="this.codebarre.length === 13 && acb !== this.codebarre">
      Le code-barre dans Odoo n'est pas exactement celui recherché (espaces ? autres caractères ?)
    </div>
    <div v-if="image !== null" class="img bg-grey-2"><img class="img" :src="image"/></div>
    <div v-else class="text-h6">Pas d'image</div>
    <div v-for="a in article" :key="a.c" class="row">
      <div class="champ">{{ a.c }}
        <q-tooltip>{{ a.c }}</q-tooltip>
      </div>
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

  <q-dialog v-model="aliste">
    <q-layout view="Lhh lpR fff" container class="bg-white">
      <q-header class="bg-primary">
        <q-toolbar>
          <q-toolbar-title>Articles dont le code-barre CONTIENT "{{ codebarre }}"</q-toolbar-title>
          <q-btn flat v-close-popup round dense icon="close" />
        </q-toolbar>
      </q-header>

      <q-footer class="bg-black text-white">
        <q-toolbar inset>
          <q-toolbar-title v-if="aliste">{{ liste.length }} articles</q-toolbar-title>
        </q-toolbar>
      </q-footer>

      <q-page-container>
        <q-page padding>
          <div v-for="a in liste" :key="a.cb">
            <div :class="'row no-wrap cursor-pointer' + (a.idx == courant ? ' bg-indigo-8 text-white' : '')" @click="clicArticle(a)">
              <div class="col">{{ a.cb }}
                <q-tooltip>{{ a.cb }}</q-tooltip>
              </div>
              <div class="col-2 q-px-lg">{{ a.f }}
                <q-tooltip>{{ a.f }}</q-tooltip>
              </div>
              <div class="col-8">{{ a.n }}</div>
            </div>
          </div>
        </q-page>
      </q-page-container>
    </q-layout>
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

const optionsrecherche = ['égalité stricte', 'contient ce code']

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

export default {
  name: 'CodeBarre',
  components: { InputBarcode },
  data () {
    return {
      imprcbouvert: false,
      liste: [],
      aliste: false,
      optionsrecherche: optionsrecherche,
      option: optionsrecherche[0],
      codebarre: '',
      etiq: '',
      etiqs: [],
      fournisseur: '',
      nom: '',
      acb: '',
      image: null,
      erreur: null,
      titre: '',
      chargt: false,
      article: null,
      courant: 0
    }
  },
  mounted () {
    const t = []
    for (const e in global.config.etiquettes) t.push(e)
    this.etiqs = t
    this.etiq = this.etiqs[0]
  },
  computed: {
    estegal () { return optionsrecherche[0] === this.option }
  },
  methods: {
    async cbchange (event) {
      this.codebarre = event.codebarre
      this.codebarreURL = event.dataURL
      if (this.estegal) {
        if (event.err) {
          this.article = null
        } else {
          await this.getArticle()
        }
      }
    },
    async recherche () {
      await this.getArticle()
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
          domain: [['barcode', this.estegal ? '=' : 'like', this.codebarre]],
          // fields: fields, // omettre cette ligne pour avoir TOUS les champs
          order: '',
          limit: 9999,
          offset: 0
        }
        this.articles = await post('m1/search_read', { model: 'product.product', params: params, timeout: 20000 })
        console.log('nb articles : ' + this.articles.length)
        // console.log(JSON.stringify(articles))
        this.liste = []
        if (this.articles.length) {
          for (let i = 0; i < this.articles.length; i++) {
            const a = this.articles[i]
            const f = a.default_seller_id && a.default_seller_id.length === 2 ? a.default_seller_id[1] : ''
            this.liste.push({ cb: a.barcode, f: f, n: a.display_name, idx: i })
          }
          this.liste.sort((a, b) => a.cb < b.cb ? -1 : (a.cb === b.cb ? 0 : 1))
        }
        this.courant = 0
        this.article = null
        this.aliste = false
        if (this.articles.length === 1) {
          this.afficheArticle()
        }
        if (this.liste.length > 1) {
          this.aliste = true
          this.afficheArticle()
        }
      } catch (e) {
        console.log(e.message)
      }
      this.chargt = false
      global.App.opComplete()
    },
    clicArticle (a) {
      this.courant = a.idx
      this.afficheArticle()
      this.aliste = false
    },
    afficheArticle () {
      const a = this.articles[this.courant]
      const x = []
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
      this.acb = a.barcode
      this.image = a.image ? 'data:image/jpg;base64,' + a.image : null
      this.titre = this.fournisseur + ' - ' + this.nom +
        (a.sale_ok && a.available_in_pos ? ' - passe en caisse' : ' - NE passe PAS en caisse') +
        (a.to_weight ? ' - à peser [' + a.codecourt + ']' : '')
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

.champ
  width: 16rem
  overflow: hidden
  text-overflow: ellipsis

</style>
