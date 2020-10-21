<template>
    <div>
        <div class="logo"><img src="../assets/banniere.jpg"></div>
        <div class="text-h2 text-center"> Applications du magasin</div>
        <div class="text-h4 text-center">Articles au poids disponibles sur les balances</div>
        <div class="text-h4 text-center">Code-barre : contrôle et génération d'étiquettes</div>
    </div>
</template>

<script>
export default {
  name: 'CodeBarre',
  data () {
    return {
    }
  },
  methods: {
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'
.logo
    width: 30%
    min-width: 20rem
    min-width: 40rem
    margin: 2rem auto
</style>
