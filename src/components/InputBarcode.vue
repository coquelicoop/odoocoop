<template>
  <div class="row items-center bg-white" style="padding:0.5rem; max-width:50rem;">
    <div class="col column q-mr-md" >
      <q-checkbox class="col" style="width:12rem" v-model="aupoids" label="Au poids" />
      <q-input class="col" ref="input" bottom-slots v-model="codebarre" clearable mask='####### ##### #'
          clear-icon="close" label="Code barre" counter
          :rules="[ val => checkcb(val.trim().replace(/\s/g, '')) ]"
          style="min-width:15rem;">
      </q-input>
    </div>
    <img v-if="show" class="col bg-grey-2" style="width:16rem" :src="img" />
  </div>
</template>

<script>
import { toBase64Barcode, cleEAN } from '../app/global.js'

const regChiffres = RegExp(/^\d+$/)

export default {
  name: 'InputBarcode',
  props: {
    show: Boolean
  },
  data () {
    return {
      codebarre: '',
      aupoids: false,
      img: null
    }
  },
  mounted () {
  },
  watch: {
    codebarre: function (val, old) {
      this.change(val)
    },
    aupoids: function (val, old) {
      this.change(this.codebarre)
    }
  },
  computed: {
    nbch () { return this.aupoids ? 7 : 13 }
  },
  methods: {
    async change (val) {
      let cb = val.trim().replace(/\s/g, '')
      const er = this.checkcb(cb)
      if (!er) {
        if (this.aupoids) {
          const cy = cb.substring(0, 7)
          const cx = cleEAN(cy + '000000')
          cb = cy + '00000' + cx
        }
        this.img = toBase64Barcode(cb)
        await this.$nextTick()
        this.$refs.input.resetValidation()
        this.$emit('cb-change', { codebarre: cb })
      } else {
        this.img = ''
        this.$emit('cb-change', { err: er, codebarre: cb })
      }
    },

    checkcb (s) {
      if (!this.aupoids) {
        if (typeof s !== 'string' || !regChiffres.test(s) || s.length !== 13) {
          return 'Un code-barre doit être constitué de 13 chiffres'
        }
        const c = cleEAN(s)
        const cx = s.substring(12)
        if (c !== cx) {
          return 'Celle calculée ' + c + ', celle saisie ' + cx
        }
      } else {
        if (typeof s !== 'string' || !regChiffres.test(s) || (s.length !== 13 && s.length !== 7)) {
          return 'Un code-barre au poids doit être constitué de 7 ou 13 chiffres'
        }
      }
      return ''
    }

  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
