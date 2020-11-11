<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un article</div>
  <input-barcode show v-on:cb-change="cbchange" ></input-barcode>
  <div class="row justify-start items-center q-mt-lg">
    <q-select  v-model="option" :options="optionsrecherche" label="Options de recherche" style="width:20rem"/>
    <q-btn v-if="optionsrecherche[0] !== option" round color="primary" icon="search" @click="recherche" :disable="codebarre == ''" />
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
              <tr v-for="(a, index) in liste" :key="index" @click="clicArticle(index)"
                :class="'cursor-pointer' + (index == courant ? ' bg-indigo-8 text-white' : '')">
                <td v-for="(c, index3) in champsL" :key="index3" class="text-left">{{ a[c.c] }}</td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-page>
      </q-page-container>
    </q-layout>
  </q-dialog>

</div>
</template>

<script>
import { global } from '../app/global.js'
import { productsByBarcode, setSupplierinfo } from '../app/reqOdoo.js'
import InputBarcode from './InputBarcode.vue'
import FicheArticle from './FicheArticle.vue'

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
  },
  computed: {
    estegal () { return optionsrecherche[0] === this.option }
  },
  methods: {
    async suivprec (n) {
      this.courant += n
      await this.setArt()
    },

    async cbchange (event) {
      this.codebarre = event.codebarre
      if (this.estegal) {
        if (event.err) {
          this.liste = null
          this.article = false
          this.aliste = false
        } else {
          await this.recherche()
        }
      }
    },

    async recherche () {
      global.App.opStart()
      this.chargt = true
      try {
        this.articles = await productsByBarcode(this.codebarre)
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
        await this.setArt()
        this.aliste = this.liste.length > 1
      } catch (e) {
        console.log(e.message)
      }
      this.chargt = false
      global.App.opComplete()
    },

    async clicArticle (index) {
      this.courant = index
      await this.setArt()
      this.aliste = false
    },

    async setArt () {
      const a = this.liste && this.liste.length ? this.articles[this.liste[this.courant].idx] : false
      this.nom = a.display_name.substring(0, 30)
      this.codebarre = a.barcode
      this.fourn = a.default_seller_id[1].substring(0, 30)
      if (a.seller_ids.length && a.supplierinfo.length !== a.seller_ids.length) {
        await setSupplierinfo(a)
      }
      this.article = a // Asignation à la fin : il y a un await plus haut, ne pas assigner AVANT
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
