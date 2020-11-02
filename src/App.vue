<template>
  <q-layout id="q-app" view="hHh lpR fFf" class="bg-grey-1">
    <q-header elevated class="text-white bg-grey-9">
      <q-toolbar>
        <q-btn flat round @click="menuOuvert = true" icon="menu" aria-label="Menu"/>
        <q-toolbar-title>Applications du magasin
          <div v-if="env !== 'p'" class="env">{{cenv}}</div>
        </q-toolbar-title>
        <q-tabs v-model="tab" no-caps inline-label class="text-white shadow-2">
          <q-tab name="accueil" label="Accueil" />
          <q-tab name="apeser" label="Articles à peser" icon="img:tomate.png"/>
          <q-tab name="codebarre" label="Code barre" />
          <q-tab name="po" label="PO" />
        </q-tabs>
      </q-toolbar>
      <tool-bar-articles v-if="tab == 'apeser'"></tool-bar-articles>
    </q-header>

    <q-footer elevated class="q-py-md bg-grey-9 text-white" style="height:1.2rem">
      <span class="status">{{ info }}</span>
    </q-footer>

    <!-- Le panneau gauche est le Menu -->
    <q-drawer v-model="menuOuvert" overlay bordered content-class="bg-white" :width="450">
      <div class="absolute" style="top:0;right:-1rem">
        <!-- Bouton pour refermer le panneau : invisible quand le panneau n'est visible, sinon on en voit quand même un bout -->
        <q-btn v-if="menuOuvert" dense round unelevated color="accent" icon="chevron_left" @click="menuOuvert = false"/>
      </div>
      <q-list bordered separator>
        <q-item>
          Version : {{ version }}
        </q-item>
        <q-item v-if="username ? true : false">
          <q-btn :label="'Déconnecter ' + username" @click="deconnecter"/>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Zone centrale -->
    <q-page-container>
      <div v-if="tab === 'accueil'"><vue-accueil></vue-accueil></div>
      <div v-if="tab === 'codebarre'"><code-barre></code-barre></div>
      <div v-if="tab === 'apeser'"><liste-articles></liste-articles></div>
      <div v-if="tab === 'po'"><purchase-order></purchase-order></div>
    </q-page-container>

    <q-dialog v-model="loginOuvert" persistent transition-show="flip-down" transition-hide="flip-up">
      <q-card>
        <q-card-section>
        <q-select v-model="cenv" :options="envs" label="Environnements" style="width:10rem"/>
        <q-input input-class="login" bottom-slots v-model="username" label-slot style="width:20rem">
          <template v-slot:label>
            <span class="login">E-mail de connexion au portail</span>
          </template>
        </q-input>
        <q-input input-class="login" bottom-slots v-model="password" type="password" label-slot style="width:20rem">
          <template v-slot:label>
            <span class="login">Mot de passe</span>
          </template>
        </q-input>
        </q-card-section>

        <q-card-actions align="right" class="bg-grey-8 text-white">
          <q-btn flat label="Connection" @click="connection"/>
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="abort" seamless position="top">
      <q-card style="width: 350px">
        <q-card-section class="row items-center no-wrap">
          <div>
            <div class="text-weight-bold">Je ne veux plus attendre</div>
            <div class="text-weight-bold">J'annule ma demande</div>
          </div>
          <q-space />
          <q-spinner color="primary" size="3em" :thickness="2" />
          <q-btn flat round icon="close" @click="clicAbort" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="erreurOuvert">
      <q-card  style="width:500px;max-width:80vw;">>
        <q-card-section>
          <div class="text-h6">{{erreur.majeur}}</div>
        </q-card-section>
        <q-card-section class="q-pt-none">
          <div>Code : {{ erreur.code }}</div>
          <div v-if="erreur.message">{{ erreur.message }}</div>
          <div v-if="erreur.detail">
            Détail <q-toggle v-model="errdetail"/>
            <span v-if="errdetail">{{ erreur.detail }}</span>
          </div>
          <div v-if="erreur.stack">
            Stack <q-toggle v-model="errstack"/>
            <q-input v-if="errstack" type="textarea" v-model="erreur.stack" style="height:150px;"/>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="j'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-layout>
</template>

<script>
import { version } from '../package.json'
import { global, loadConfig, post, cancelRequest } from './app/global.js'
import ListeArticles from './components/ListeArticles.vue'
import ToolBarArticles from './components/ToolBarArticles.vue'
import CodeBarre from './components/CodeBarre.vue'
import VueAccueil from './components/VueAccueil.vue'
import PurchaseOrder from './components/PurchaseOrder.vue'

export default {
  name: 'App',
  components: { ToolBarArticles, ListeArticles, CodeBarre, VueAccueil, PurchaseOrder },
  data () {
    return {
      version: version,
      menuOuvert: false,
      loginOuvert: true,
      erreurOuvert: false,
      username: '',
      password: '',
      abort: false,
      img: null,
      codebarre: '',
      config: { host: '?' },
      erreur: {},
      errstack: false,
      errdetail: false,
      tab: 'accueil',
      info: 'Bonjour !',
      cenv: '',
      env: 'p',
      envs: []
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
  },
  watch: {
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
      // métode à invoquer pour afficher une erreur
      this.errdetail = false
      this.errstack = false
      this.erreurOuvert = true
      this.erreur = e
    },

    setInfo (s) {
      // affiche une info dans la barre d'info en bas
      this.info = s
    },

    opStart () {
      // à invoquer avant toute requête au proxy
      this.abort = true
    },

    opComplete () {
      // à invoquer après une requête au proxy
      this.abort = false
    },

    async connection () {
      this.opStart()
      try {
        const res = await post('m1/connection')
        console.log(res.ok)
        this.loginOuvert = false
      } catch (e) { }
      this.opComplete()
    },

    deconnecter () {
      this.username = ''
      this.tab = 'accueil'
      this.loginOuvert = true
      this.menuOuvert = false
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
.login
  font-weight: bold
</style>
