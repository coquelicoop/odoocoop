<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un article</div>
  <input-barcode ref="inpcb" show v-on:cb-change="cbchange" ></input-barcode>
  <div class="row justify-start items-center q-mt-lg">
    <q-select  v-model="option" :options="optionsrecherche" label="Options de recherche" style="width:20rem"/>
    <q-btn v-if="optionsrecherche[0] !== option" round color="primary" icon="search" @click="recherche" :disable="codebarre == ''" />
  </div>
  <div class="q-my-md">
    <q-btn icon="print" label="Planche de code-barre" @click="imprcbouvert = true" :disable="!codebarreURL && !article" />
  </div>
  <div class="q-my-md row items-center" v-if="liste && liste.length > 1">
    <q-btn icon="skip_previous" size="sm" label="Précédent" @click="suivprec(-1)" :disable="courant === 0" />
    <div class="q-mx-lg">{{ courant + 1 }} / {{ liste.length }}</div>
    <q-btn icon-right="skip_next" size="sm" label="Suivant" @click="suivprec(1)" :disable="courant === liste.length - 1" />
    <q-btn icon="view_list" size="sm" label="Voir la liste" @click="aliste = true" />
  </div>
  <div class="text-h4 text-red-5" v-if="this.codebarre.length === 13 && article && article.barcode !== this.codebarre">
    Le code-barre dans Odoo n'est pas exactement celui recherché (espaces ? autres caractères ?)
  </div>
  <div class="text-h4" v-if="!article && !chargt && codebarre">Pas d'article avec ce code-bare</div>
  <div class="text-h5 text-italic" v-if="chargt">Recherche en cours ...</div>
  <fiche-article :mon-article="article"></fiche-article>

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

  <q-dialog v-model="aliste" full-width>
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
          <q-markup-table>
            <thead>
              <tr>
                <th v-for="(c, index1) in champsL" :key="index1"  class="text-left">{{ c.n }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(a, index) in liste" :key="index"
                :class="'cursor-pointer' + (index == courant ? ' bg-indigo-8 text-white' : '')" @click="clicArticle(index)">
                <td v-for="(c, index3) in champsL" :key="index3" class="text-left">{{ a[c.c] }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-page>
      </q-page-container>
<!--
      <q-page-container>
        <q-page padding>
          <div v-for="(a, index) in liste" :key="index">
            <div :class="'row cursor-pointer' + (index == courant ? ' bg-indigo-8 text-white' : '')" @click="clicArticle(index)">
              <div class="">{{ a.cb }}
                <q-tooltip>{{ a.cb }}</q-tooltip>
              </div>
              <div class="q-px-lg" style="max-width:15rem">{{ a.f }}
                <q-tooltip>{{ a.f }}</q-tooltip>
              </div>
              <div class="col">{{ a.n }}</div>
            </div>
          </div>
        </q-page>
      </q-page-container>
-->
    </q-layout>
  </q-dialog>

</div>
</template>

<script>
import { global, post } from '../app/global.js'
import InputBarcode from './InputBarcode.vue'
import FicheArticle from './FicheArticle.vue'
import { jsPDF } from 'jspdf'

const optionsrecherche = ['égalité stricte', 'contient ce code']

const champsL = [
  { n: 'code-barre', c: 'cb' },
  { n: 'fournisseur', c: 'f' },
  { n: 'nom', c: 'n' }
]

export default {
  name: 'CodeBarre',
  components: { InputBarcode, FicheArticle },
  data () {
    return {
      imprcbouvert: false,
      optionsrecherche: optionsrecherche,
      option: optionsrecherche[0],
      codebarre: '',
      codebarreURL: null,
      etiq: '',
      etiqs: [],
      erreur: null,
      chargt: false,
      liste: [],
      articles: [],
      article: false,
      aliste: false,
      champsL: champsL,
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
    suivprec (n) {
      this.courant += n
      this.setArt()
    },
    async cbchange (event) {
      this.codebarre = event.codebarre
      this.codebarreURL = event.dataURL
      if (this.estegal) {
        if (event.err) {
          this.liste = null
          this.setArt()
        } else {
          await this.getArticles()
        }
      }
    },
    async recherche () {
      await this.getArticles()
    },
    async imprimer () {
      global.App.opStart()
      const cfg = global.config.etiquettes[this.etiq]
      let u
      if (this.article && this.article.barcode === this.codebarre) {
        u = this.codebarreURL
      } else {
        u = this.$refs.inpcb.toBase64Barcode(this.article.barcode)
      }
      try {
        // eslint-disable-next-line
        const doc = new jsPDF()
        doc.setFont('fixed')
        doc.setFontSize(9)

        for (let i = 0; i < cfg.nx; i++) {
          for (let j = 0; j < cfg.ny; j++) {
            const x1 = cfg.g + (i * cfg.dx) - 2
            const y1 = cfg.h + (j * cfg.dy) + 2
            doc.addImage(u, 'JPEG', x1, y1, cfg.cbl, cfg.dy - 2, 'IMG1', 'NONE', 0)
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
    async getArticles () {
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
        this.setArt()
        this.aliste = this.liste.length > 1
      } catch (e) {
        console.log(e.message)
      }
      this.chargt = false
      global.App.opComplete()
    },
    clicArticle (index) {
      this.courant = index
      this.setArt()
      this.aliste = false
    },
    setArt () {
      this.article = this.liste && this.liste.length ? this.articles[this.liste[this.courant].idx] : false
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
