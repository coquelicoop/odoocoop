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
          <q-tab name="autre" label="Autre" />
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-footer elevated class="q-py-md bg-grey-9 text-white" style="height:1.2rem">
      <span class="status">{{ info }}</span>
    </q-footer>

    <!-- Le panneau gauche est le Menu -->
    <q-drawer v-model="menuOuvert" overlay bordered content-class="bg-white">
      <div class="absolute" style="top:0;right:-2rem">
        <!-- Bouton pour refermer le panneau : invisible quand le panneau n'est visible, sinon on en voit quand même un bout -->
        <q-btn v-if="menuOuvert" dense round unelevated color="accent" icon="chevron_left" @click="menuOuvert = false"/>
      </div>
      <q-list>
        <q-item>
          <q-select v-model="cenv" :options="envs" label="Environnements" style="width:10rem"/>
        </q-item>
      </q-list>
    </q-drawer>

    <!-- Zone centrale -->
    <q-page-container>
      <div v-if="tab === 'accueil'">Bonjour !
        <q-btn label="A peser" @click="articlesAPeser" />
        <q-btn label="A peser-Recharg" @click="articlesAPeserR" />
        <div>Date-heure: {{articles.dh}}<br>SHA: {{articles.sha}}<br>Nb articles: {{articles.liste.length}}</div>
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
      <div v-if="tab === 'autre'">
        <p v-for="n in 15" :key="n">
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Fugit nihil praesentium molestias a adipisci, dolore vitae odit, quidem consequatur optio voluptates asperiores pariatur eos numquam rerum delectus commodi perferendis voluptate?
        </p>
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
import { global, loadConfig, get, post, cancelRequest, checkEAN13 } from './app/global.js'

export default {
  name: 'App',
  components: { },
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
      cenv: '',
      env: 'p',
      envs: [],
      erreur: null
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
      } catch { }
    }
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
        const x = await post(global.env + 'm1/articlesAPeser', args)
        if (x.sha === this.articles.sha) {
          this.articles = { dh: x.dh, sha: x.sha, liste: this.articles.liste }
          this.setInfo('Liste d\'articles inchangée')
        } else {
          this.articles = { dh: x.dh, sha: x.sha, liste: x.liste }
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
    }
  }
}

</script>
<style lang="sass">
@import './css/app.sass'
.status
  font-size: 0.8rem
  position: relative
  top: -0.6rem
.env
  font-size: 0.8rem
  font-weight: bold
  position: relative
  top: -0.4rem
  text-align: center
  background-color: white
  color: red
</style>
