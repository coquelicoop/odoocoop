<template>
    <q-toolbar class="column bg-grey-9" style="padding-top:1rem">
      <div class="row justify-center items-center q-gutter-xs">
        <q-btn push color="white" text-color="primary" label="Liste en cours" icon="refresh"  @click="articlesAPeser" class="refreshBtn">
          <q-tooltip>
          Charger liste utilisée par les balances
          </q-tooltip>
        </q-btn>
        <q-btn push color="white" text-color="deep-orange" label="Recharger depuis Odoo" icon="refresh" @click="articlesAPeserR" class="refreshBtn">
          <q-tooltip>
          FORCE le rafraîchissement de la liste de Odoo
          </q-tooltip>
        </q-btn>
      </div>
      <div class="row justify-center items-center q-gutter-xs">
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
      <div class="row apeserInfo">
        <span v-if="articles.nberreurs !== 0" class="la-red">{{articles.nberreurs}} articles en erreurs</span>
        {{articles.liste.length}} articles | {{articles.dh}} | {{articles.sha}}
      </div>
    </q-toolbar>
</template>

<script>
import { global } from '../app/global.js'

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
  name: 'ListeArticles',
  components: { },
  data () {
    return {
      articles: { nberreurs: 0, dh: '', sha: '', liste: [] },
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
    global.ToolBarArticles = this
  },

  watch: {
    // détection du changement de critère de tri
    tri (option, avant) {
      this.itri = this.optionsTri.indexOf(option)
      if (this.itri !== -1 && option !== avant) {
        global.ListeArticles.itri = this.itri
        global.ListeArticles.trier()
      }
    },
    // détection du changement de critère de filtre
    filtre (option, avant) {
      this.ifiltre = this.optionsFiltre.indexOf(option)
      if (this.ifiltre !== -1 && option !== avant) {
        global.ListeArticles.ifiltre = this.ifiltre
        global.ListeArticles.filtrer()
      }
    },
    // détection du changement de valeur du paramètre optionnel du critère de filtre courant
    argFiltre (option, avant) {
      if (option !== avant) {
        global.ListeArticles.argFiltre = this.argFiltre
        global.ListeArticles.filtrer()
      }
    }
  },

  methods: {
    setArticles (a) { this.articles = a },
    articlesAPeser () { global.ListeArticles.articlesAPeser() },
    articlesAPeserR () { global.ListeArticles.articlesAPeserR() }
  }
}
</script>
