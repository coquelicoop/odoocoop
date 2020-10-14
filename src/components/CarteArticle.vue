<!--
Affichage complètement passif d'un article.<template>
Seul élément dynamique : l'affichage des erreurs quand on clique sur lechip "erreurs"
-->
<template>
<div style="position:relative">
  <!-- chip indiquant la présence d'erreurs sur l'article -->
  <div v-if="article.erreurs.length" class="chip" @click.stop="erreurs = true">
    <q-chip dense>
        <q-avatar color="negative" text-color="white">{{ article.erreurs.length }}</q-avatar>{{ article.erreurs.length == 1 ? 'erreur' : 'erreurs'}}
    </q-chip>
  </div>

  <div class="carteArticle shadow-5 row no-wrap justify-start items-center q-gutter-xs">
    <!-- image ou zone grise exactement de même taille -->
    <div class="col-auto">
      <img v-if="article.image.length !== 0" class="image" :src="'data:image/jpeg;base64,' + article.image">
      <div v-else class="image  bg-grey-4"></div>
    </div>

    <!-- colonne du code court, du code barre, de la catégorie et de son statut d'édition -->
    <div class="col-auto column items-start droite">
      <div class="col-auto prix">{{ article.id }} - [{{ article.codeCourt }}]</div>
      <div class="col-auto prix">{{ article['code-barre'] }}</div>
      <div class="col-auto prix">{{ article.categorie }}</div>
    </div>

    <!-- colonne du nom du produit -->
    <div class="col nomproduit">{{ article.nom }}</div>

    <!-- colonne du prix, du pods par pièce et de l'icône BIO -->
    <div class="col-auto column items-start droite">
      <div class="col-auto prix" v-if="article.unite === 'kg'">{{ article.prix }}€ le Kg</div>
      <div class="col-auto prix" v-else>{{ article.prix }}€ piéce</div>
      <div v-if="article.bio" class="col self-end"><img class="iconeAB" src="../assets/logoAB.jpg"></div>
    </div>
  </div>

  <!-- Dialogue affichant les erreurs sur l'article -->
  <q-dialog v-model="erreurs">
    <q-card>
      <q-card-section>
        <div class="text-h6">{{ (article.erreurs.length > 1 ? '' + article.erreurs.length + ' erreurs' : '1 erreur') + ' dans cet article'}}</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <div v-for="a in article.erreurs" :key="a">{{ a }}</div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn size="1.5rem" flat label="J'ai lu" color="negative" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</div>
</template>

<script>
export default {
  name: 'CarteArticle',
  props: ['article'],
  data () {
    return {
      erreurs: false
    }
  },
  methods: {
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'
$hauteur: 5rem

.carteArticle
  height: $hauteur
  margin: 0.5rem 1rem 0 0.5rem
  padding: 0
  background-color: white
  cursor: pointer
  overflow: hidden
  color: black

.chip
  position: absolute
  left: 0.2rem
  font-weight: bold
  z-index: 10
  cursor: pointer

.image
  width: $hauteur
  height: $hauteur
  margin: 0.1rem

.nomproduit
  padding: 0.5rem
  text-align: left
  font-size: $standardFontSize
  font-weight: bold

.droite
  margin-right: 0.5rem

.prix
  font-size: $standardFontSize
  line-height: $standardFontSize
  max-width: 10rem

.rouge
  font-weight: bold
  color: red

.iconeAB
  width: $veryLargeFontSize
  height: $veryLargeFontSize

</style>
