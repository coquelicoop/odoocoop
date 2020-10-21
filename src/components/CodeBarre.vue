<template>
    <div>
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
</template>

<script>
import { global, get, checkEAN13 } from '../app/global.js'
export default {
  name: 'CodeBarre',
  data () {
    return {
      codebarre: '',
      img: null
    }
  },
  methods: {
    async getCodeBarre () { // 3254550031046
      if (!checkEAN13(this.codebarre)) return
      global.App.opStart()
      this.img = null
      try {
        this.img = await get('m1/codebarre?cb=' + this.codebarre)
      } catch (e) { }
      global.App.opComplete()
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
