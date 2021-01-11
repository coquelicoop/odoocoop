<template>
<div style="margin:1rem;">
  <div class="text-h4">A propos d'un article</div>
  <input-barcode show v-on:cb-change="cbchange" ></input-barcode>
  <div class="row justify-start items-center q-my-lg">
    <q-btn color="primary" class="q-ma-sm" icon-right="search" @click="rechercheeq" label="Ayant exactement ce code-barre"/>
    <q-btn color="secondary" class="q-ma-sm" icon-right="search" @click="recherche" label="Dont le code-barre contient ce code"/>
  </div>
  <div class="q-my-md row items-center" v-if="liste && liste.length > 1">
    <q-btn icon="skip_previous" size="sm" label="Précédent" @click="suivprec(-1)" :disable="courant === 0" />
    <div class="q-mx-lg">{{ courant + 1 }} / {{ liste.length }}</div>
    <q-btn icon-right="skip_next" size="sm" label="Suivant" @click="suivprec(1)" :disable="courant === liste.length - 1" />
    <q-btn icon="view_list" size="sm" label="Voir la liste" @click="aliste = true" />
  </div>
  <div class="text-h4 text-red-5" v-if="article && un && (article.barcode !== codebarre)">
    Le code-barre dans Odoo n'est pas exactement celui recherché (espaces ? autres caractères ?)
  </div>
  <div class="text-h4" v-if="cherche && !article && !chargt">Pas d'article avec ce code-barre</div>
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
      un: true,
      codebarre: '',
      erreur: null,
      chargt: false,
      cherche: false,
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
  methods: {
    async suivprec (n) {
      this.courant += n
      await this.setArt()
    },

    async cbchange (event) {
      this.codebarre = event.codebarre
      this.liste = null
      this.article = false
      this.aliste = false
      this.cherche = false
    },

    async rechercheeq () {
      await this.recherche(true)
    },

    async recherche (eq) {
      this.un = eq === true
      global.App.opStart()
      this.chargt = true
      try {
        const r = await productsByBarcode(this.codebarre, this.un)
        this.articles = this.un ? [r] : r
        this.liste = []
        if (this.articles.length) {
          for (let i = 0; i < this.articles.length; i++) {
            const a = this.articles[i]
            a.fournisseur = a.default_seller_id && a.default_seller_id.length === 2 ? a.default_seller_id[1] : ''
            this.liste.push({ cb: a.barcode, f: a.fournisseur, n: a.display_name, idx: i })
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
      this.cherche = true
      global.App.opComplete()
    },

    async clicArticle (index) {
      this.courant = index
      await this.setArt()
      this.aliste = false
    },

    async setArt () {
      this.article = null
      const a = this.liste && this.liste.length ? this.articles[this.liste[this.courant].idx] : false
      this.nom = a.display_name.substring(0, 30)
      this.codebarre = a.barcode
      this.fourn = a.fournisseur.substring(0, 30)
      this.chargt = true
      if (a.seller_ids.length && a.supplierinfo.length !== a.seller_ids.length) {
        await setSupplierinfo(a)
      }
      this.chargt = false
      this.article = a // Asignation à la fin : il y a un await plus haut, ne pas assigner AVANT
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
