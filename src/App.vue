<template>
  <q-layout id="q-app" view="hHh lpR fFf" class="bg-grey-1">
    <q-header elevated class="text-white bg-grey-9">
      <q-toolbar>
        <q-btn flat round @click="menuOuvert = true" icon="menu" aria-label="Menu"/>
        <q-toolbar-title>Utilitaires Odoo
          <div v-if="env !== 'p'" class="env">{{cenv}}</div>
        </q-toolbar-title>
        <q-tabs v-model="tab" no-caps class="text-white shadow-2">
          <q-tab name="accueil" label="Accueil" />
          <q-tab name="codebarre" label="Code barre" />
          <q-tab name="apeser" label="Articles à peser" />
        </q-tabs>
      </q-toolbar>

      <div v-if="tab == 'apeser'" class="col row justify-center items-center q-gutter-md q-pa-sm bg-grey-9">
        <q-btn push color="white" text-color="primary" round icon="refresh"  @click="articlesAPeser" class="refreshBtn">
          <q-tooltip>
          Derier état chargé depuis Odoo
          </q-tooltip>
        </q-btn>
        <q-btn push color="white" text-color="deep-orange" round icon="refresh" @click="articlesAPeserR" class="refreshBtn">
          <q-tooltip>
          FORCE le rechargement depuis Odoo
          </q-tooltip>
        </q-btn>
        <!-- Critères de tri prédéfinis -->
        <q-select style="min-width:10rem" color="black" bg-color="grey-1" filled bottom-slots v-model="tri" :options="optionsTri" label="Critère de tri" dense options-dense >
          <template v-slot:prepend>
            <q-icon name="sort" @click.stop />
          </template>
        </q-select>
        <!-- Critères de sélections prédéfinis -->
        <q-select style="min-width:25rem" color="black" bg-color="grey-1" filled bottom-slots v-model="filtre" :options="optionsFiltre" label="Critère de filtre" dense options-dense >
          <template v-slot:prepend>
            <q-icon name="filter_list" @click.stop />
          </template>
        </q-select>
        <!-- Paramètre du tri, selon le critère choisi -->
        <q-input style="min-width:6rem;position:relative;top:-0.6rem" color="black" bg-color="grey-1" dense filled v-model="argFiltre" label="argument ..."/>
      </div>

    </q-header>

    <q-footer elevated class="q-py-md bg-grey-9 text-white" style="height:1.2rem">
      <span class="status">{{ info }}</span>
    </q-footer>

    <!-- Le panneau gauche est le Menu -->
    <q-drawer v-model="menuOuvert" overlay bordered content-class="bg-white" :width="450">
      <div class="absolute" style="top:0;right:-2rem">
        <!-- Bouton pour refermer le panneau : invisible quand le panneau n'est visible, sinon on en voit quand même un bout -->
        <q-btn v-if="menuOuvert" dense round unelevated color="accent" icon="chevron_left" @click="menuOuvert = false"/>
      </div>
      <q-list bordered separator>
        <q-item>
          <q-select v-model="cenv" :options="envs" label="Environnements" style="width:10rem"/>
        </q-item>
        <q-item>
          <div>
            <span style="font-weight:bold">Informations sur la liste des articles à peser</span><br>
            <span class="apeserInfo">Date-heure: {{articles.dh}}<br>
              SHA: {{articles.sha}}<br>
              Nb articles: {{articles.liste.length}}
          </span>
          </div>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Zone centrale -->
    <q-page-container>
      <div v-if="tab === 'accueil'">Bonjour !
        <p v-for="n in 15" :key="n">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit nihil praesentium molestias a adipisci, dolore vitae odit, quidem consequatur optio voluptates asperiores pariatur eos numquam rerum delectus commodi perferendis voluptate?
        </p>
      </div>
      <div v-if="tab === 'codebarre'">
        <q-input bottom-slots v-model="codebarre" label="Code barre" counter maxlength="13" style="width:15rem">
          <template v-slot:hint>
            13 chiffres
          </template>
          <template v-slot:append>
            <q-btn round dense flat icon="check" @click="getCodeBarre" />
          </template>
        </q-input>
        <img :src="img"/>
      </div>
      <div v-if="tab === 'apeser'">
        <div v-if="selArticles.length === 0" class="pasArticles" style="height:100vh;margin-top:40vh">
          {{ chargement ? 'Chargement en cours ...' : 'Pas d\'articles' }}
        </div>
        <div v-else style="width:100%">
          <div v-for="(a, index) in selArticles" :key="index">
            <carte-article :article="a"></carte-article>
          </div>
        </div>
      </div>
    </q-page-container>

    <q-dialog v-model="abort" seamless position="top">
      <q-card style="width: 350px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold">Je ne veux plus attendre</div>
            <div class="text-weight-bold">J'annule ma demande</div>
          </div>
          <q-space />
          <q-btn flat round icon="close" @click="clicAbort" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="erreur">
      <q-card>
        <q-card-section>
          <div class="text-h6">{{detail.majeur}}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div v-if="detail.code !== 0">Code : {{ detail.code }}</div>
          <div>{{ detail.message }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="j'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script>
import { global, loadConfig, get, post, cancelRequest, checkEAN13, decoreArticles, removeDiacritics } from './app/global.js'
import CarteArticle from './components/CarteArticle.vue'

// Liste des critères de filtres des articles
const optionsFiltre = [
  'Tous',
  'En erreur',
  'Bio',
  'Non bio',
  'A l\'unité',
  'Au Kg',
  'Sans image',
  'Avec image de largeur > à ...',
  'Dont le code commence par ...',
  'Dont le code barre commence par ...',
  'Dont le code court est ...',
  'Dont le nom contient ...',
  'Dont le nom commence par ...',
  'Créés',
  'Modifiés',
  'Supprimés',
  'Inchangés',
  'Doublons de code article',
  'Ayant un code court fixé'
]

const optionsTri = ['Numéro de ligne', 'Code de l\'article', 'Nom (alphabétique)', 'Code barre', 'Code court à 2 lettres']

export default {
  name: 'App',
  components: { CarteArticle },
  data () {
    return {
      menuOuvert: false,
      abort: false,
      img: null,
      codebarre: '',
      config: { host: '?' },
      detail: {},
      tab: 'accueil',
      info: 'Bonjour !',
      articles: { dh: '', sha: '', liste: [] },
      selArticles: [],
      tousArticles: [],
      chargement: true,
      cenv: '',
      env: 'p',
      envs: [],
      erreur: null,
      optionsFiltre: optionsFiltre,
      optionsTri: optionsTri,
      tri: 'Numéro de ligne', // critère de tri courant
      itri: 0, // indice du critère de tri dans la liste des critères
      filtre: 'Tous', // critère de filtre
      ifiltre: 0, // indice du critère de filtre dans la liste
      argFiltre: '' // paramètre optionnel du critère de filtre actuel (tous n'en n'ont pas un)
    }
  },
  async mounted () {
    global.App = this
    this.config = await loadConfig()
    if (!this.config.envs) this.config.envs = { p: 'Production ' }
    const t = []
    for (const e in this.config.envs) t.push(this.config.envs[e])
    this.envs = t
    this.cenv = this.config.envs.p
    const st = localStorage.getItem('articles')
    if (st) {
      try {
        this.articles = JSON.parse(st)
        this.tousArticles = decoreArticles(this.articles.liste)
        this.filtrer()
      } catch { }
    }
    this.chargement = false
  },
  watch: {
    // détection du changement de critère de tri
    tri (option, avant) {
      this.itri = this.optionsTri.indexOf(option)
      if (this.itri !== -1 && option !== avant) { this.trier() }
    },
    // détection du changement de critère de filtre
    filtre (option, avant) {
      this.ifiltre = this.optionsFiltre.indexOf(option)
      if (this.ifiltre !== -1 && option !== avant) { this.filtrer() }
    },
    // détection du changement de valeur du paramètre optionnel du critère de filtre courant
    argFiltre (option, avant) {
      if (option !== avant) { this.filtrer() }
    },
    cenv: function (val) {
      for (const e in this.config.envs) {
        if (this.config.envs[e] === val) {
          global.env = e
          this.env = e
        }
      }
      this.menuOuvert = false
    }
  },
  methods: {
    clicAbort () {
      cancelRequest()
      this.abort = false
    },

    displayErreur (e) {
      this.erreur = true
      this.detail = e
    },

    setInfo (s) {
      this.info = s
    },

    async articlesAPeserR () {
      await this.articlesAPeser(true)
    },

    async articlesAPeser (recharg) {
      this.abort = true
      try {
        const args = { dh: this.articles.dh, sha: this.articles.sha }
        if (recharg) args.recharg = true
        const x = await post('m1/articlesAPeser', args)
        if (x.sha === this.articles.sha) {
          this.articles = { dh: x.dh, sha: x.sha, liste: this.articles.liste }
          this.setInfo('Liste d\'articles inchangée')
        } else {
          this.articles = { dh: x.dh, sha: x.sha, liste: x.liste }
          this.tousArticles = decoreArticles(this.articles.liste)
          this.filtrer()
          this.setInfo('Nouvelle liste d\'articles')
          localStorage.setItem('articles', JSON.stringify(this.articles))
        }
      } catch (e) { }
      this.abort = false
    },

    async getCodeBarre () { // 3254550031046
      if (!checkEAN13(this.codebarre)) return
      this.abort = true
      this.img = null
      try {
        this.img = await get(global.env + 'm1/codebarre?cb=' + this.codebarre)
      } catch (e) { }
      this.abort = false
    },

    // tri des articles selon le critère demandé
    trier () {
      const c = this.itri
      // optionsTri: ['Numéro de ligne', 'Code de l\'article', 'Nom (alphabétique)', 'Code barre', 'Code court à 2 lettres']
      switch (c) {
        case 0 : { this.selArticles.sort((a, b) => { return a.n > b.n ? 1 : (a.n < b.n ? -1 : 0) }); break }
        case 1 : { this.selArticles.sort((a, b) => { return a.id > b.id ? 1 : (a.id < b.id ? -1 : 0) }); break }
        case 2 : { this.selArticles.sort((a, b) => { return a.nom > b.nom ? 1 : (a.nom < b.nom ? -1 : 0) }); break }
        case 3 : { this.selArticles.sort((a, b) => { return a['code-barre'] > b['code-barre'] ? 1 : (a['code-barre'] < b['code-barre'] ? -1 : 0) }); break }
        case 4 : { this.selArticles.sort((a, b) => { return a.codeCourt > b.codeCourt ? 1 : (a.codeCourt < b.codeCourt ? -1 : 0) }) }
      }
    },

    // sélection des articles selon le critère de filtre courant et la valeur de son argument éventuel
    filtrer () {
      /*
      0 'Tous',
      1 'En erreur',
      2 'Bio',
      3 'Non bio',
      4 'A l\'unité',
      5 'Au Kg',
      6 'Sans image',
      7 'Avec image de largeur > à ...',
      8 'Dont le code commence par ...',
      9 'Dont le code barre commence par ...',
      10 'Dont le code court est ...',
      11 'Dont le nom contient ...',
      12 'Dont le nom commence par ...',
      13 : 'Doublons de code article'
      14 : 'Ayant un code court fixé'
      */
      const c = this.ifiltre
      let n = parseInt(this.argFiltre)
      if (isNaN(n)) { n = 0 }
      const p = this.argFiltre || ''
      const P = removeDiacritics(p.toUpperCase())
      const s = this.tousArticles
      switch (c) {
        case 0 : { this.selArticles = s.filter(a => true); break }
        case 1 : { this.selArticles = s.filter(a => a.erreurs.length !== 0); break }
        case 2 : { this.selArticles = s.filter(a => a.bio); break }
        case 3 : { this.selArticles = s.filter(a => !a.bio); break }
        case 4 : { this.selArticles = s.filter(a => a.unite !== 'kg'); break }
        case 5 : { this.selArticles = s.filter(a => !a.unite === 'kg'); break }
        case 6 : { this.selArticles = s.filter(a => !a.image); break }
        case 7 : { this.selArticles = s.filter(a => a.imagel > n); break }
        case 8 : { this.selArticles = s.filter(a => a.id.startsWith(p)); break }
        case 9 : { this.selArticles = s.filter(a => a['code-barre'].startsWith(p)); break }
        case 10 : { this.selArticles = s.filter(a => a.codeCourt.startsWith(p.toUpperCase())); break }
        case 11 : { this.selArticles = s.filter(a => a.nomN.indexOf(P) !== -1); break }
        case 12 : { this.selArticles = s.filter(a => a.nomN.startsWith(P)); break }
        case 13 : { this.selArticles = s.filter(a => this.fichier.mapId[a.id] > 1); break }
        case 14 : { this.selArticles = s.filter(a => a.nom.startsWith('[' + a.codeCourt + ']')) }
      }
      this.trier()
    }

  }
}

</script>
<style lang="sass">
@import './css/app.sass'
.status
  font-size: $smallFontSize
  position: relative
  top: -0.6rem
.env
  font-size: $smallFontSize
  font-weight: bold
  position: relative
  top: -0.4rem
  text-align: center
  background-color: white
  color: red
.pasArticles
  text-align: center
  font-style: italic
  font-size: $veryLargeFontSize
.apeserInfo
  font-size: $smallFontSize
  font-style: italic
.refreshBtn
  position: relative
  top: -0.6rem
</style>
