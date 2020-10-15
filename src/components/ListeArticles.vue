<template>
    <div class="row auto">
        <div v-if="selArticles.length === 0" class="pasArticles" >
            {{ chargement ? 'Chargement en cours ...' : 'Pas d\'articles' }}
        </div>
        <div v-else style="width:100%">
            <div v-for="(a, index) in selArticles" :key="index">
            <carte-article :article="a"></carte-article>
            </div>
        </div>
    </div>
</template>

<script>
import CarteArticle from './CarteArticle.vue'
import { global, post, decoreArticles, removeDiacritics } from '../app/global.js'

export default {
  name: 'ListeArticles',
  components: { CarteArticle },
  data () {
    return {
      articles: { nberreurs: 0, dh: '', sha: '', liste: [] },
      selArticles: [],
      tousArticles: [],
      nberreurs: 0,
      chargement: true,
      itri: 0, // indice du critère de tri dans la liste des critères
      ifiltre: 0, // indice du critère de filtre dans la liste
      argFiltre: '' // paramètre optionnel du critère de filtre actuel (tous n'en n'ont pas un)
    }
  },
  async mounted () {
    global.ListeArticles = this
    const st = localStorage.getItem('articles')
    if (st) {
      try {
        this.articles = JSON.parse(st)
        const t = decoreArticles(this.articles.liste)
        this.articles.nberreurs = t[0]
        this.tousArticles = t[1]
        global.ToolBarArticles.setArticles(this.articles)
        this.filtrer()
      } catch { }
    }
    this.chargement = false
  },

  methods: {
    async articlesAPeserR () {
      await this.articlesAPeser(true)
    },

    async articlesAPeser (recharg) {
      global.App.opStart()
      try {
        const args = { dh: this.articles.dh, sha: this.articles.sha }
        if (recharg) args.recharg = true
        const x = await post('m1/articlesAPeser', args)
        if (x.sha === this.articles.sha) {
          this.articles = { dh: x.dh, sha: x.sha, liste: this.articles.liste }
          this.setInfo('Liste d\'articles inchangée')
        } else {
          this.articles = { dh: x.dh, sha: x.sha, liste: x.liste }
          const t = decoreArticles(this.articles.liste)
          this.articles.nberreurs = t[0]
          this.tousArticles = t[1]
          global.ToolBarArticles.setArticles(this.articles)
          this.filtrer()
          this.setInfo('Nouvelle liste d\'articles')
          localStorage.setItem('articles', JSON.stringify(this.articles))
        }
      } catch (e) { }
      global.App.opComplete()
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
@import '../css/app.sass'
.pasArticles
  text-align: center
  font-style: italic
  font-size: $veryLargeFontSize
.apeserInfo
  font-size: $smallFontSize
  font-style: italic
  color: white
.refreshBtn
  position: relative
  top: -0.6rem
.la-red
    background-color: red
    color: white
    padding: 0 0.2rem
    font-weight: bold
    font-size: $standardFontSize
</style>
