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
      <tool-bar-articles v-if="tab == 'apeser'"></tool-bar-articles>
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
        <q-item v-if="username ? true : false">
          <q-btn :label="'Déconnecter ' + username" @click="deconnecter"/>
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
        <liste-articles></liste-articles>
      </div>
    </q-page-container>

    <q-dialog v-model="loginOuvert" persistent transition-show="flip-down" transition-hide="flip-up">
      <q-card style="width: 300px">
        <q-card-section>
        <q-select v-model="cenv" :options="envs" label="Environnements" style="width:10rem"/>
        <q-input input-class="login" bottom-slots v-model="username" label="E-mail" style="width:15rem">
          <template v-slot:hint>
            E-mail de connexion à Odoo
          </template>
        </q-input>
        </q-card-section>

        <q-card-section class="q-pt-none">
        <q-input input-class="login" bottom-slots v-model="password" type="password" label="Mot de passe" style="width:15rem">
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
import { global, loadConfig, get, post, cancelRequest, checkEAN13 } from './app/global.js'
import ListeArticles from './components/ListeArticles.vue'
import ToolBarArticles from './components/ToolBarArticles.vue'

export default {
  name: 'App',
  components: { ToolBarArticles, ListeArticles },
  data () {
    return {
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
      this.errdetail = false
      this.errstack = false
      this.erreurOuvert = true
      this.erreur = e
    },

    setInfo (s) {
      this.info = s
    },

    opStart () {
      this.abort = true
    },

    opComplete () {
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
    },

    async getCodeBarre () { // 3254550031046
      if (!checkEAN13(this.codebarre)) return
      this.opStart()
      this.img = null
      try {
        this.img = await get('m1/codebarre?cb=' + this.codebarre)
      } catch (e) { }
      this.opComplete()
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
  font-size: $largeFontSize
  font-weight: bold
</style>
