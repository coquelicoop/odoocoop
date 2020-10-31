<template>
  <div class="row items-center bg-white" style="padding:0.5rem">
    <div class="col column q-mr-md" >
      <q-checkbox class="col" style="width:12rem" v-model="aupoids" label="Au poids" />
      <q-input class="col" ref="input" bottom-slots v-model="codebarre" clearable
          clear-icon="close" label="Code barre" counter :maxlength="nbch"
          :rules="[ val => checkcb(val) ]"
          style="min-width:25rem;max-width:30rem">
      </q-input>
    </div>
    <img v-if="show" class="col bg-grey-2" style="max-width:16rem" :src="img" />
  </div>
</template>

<script>
import JsBarcode from 'jsbarcode'

const regChiffres = RegExp(/^\d+$/)

/*
  Calcul de la clé d'un string EAN13 (bien formé, 13 chiffres)
  Les chiffres sont numérotés de droite à gauche;
  Soit x, la somme des chiffres pairs et y la somme des chiffres impairs
  Calculons z = x +3*y
  Soit m le nombre divisible par 10 immédiatement supérieur à z
  La somme de contrôle est : m - z

  Exemple : 978020113447
  x = 4 + 3 + 1 + 2 + 8 + 9 = 27
  y = 7 + 4 + 1 + 0 + 0 + 7 = 19
  z = 3 * 19 + 27 = 84
  m = 90
  Somme de contrôle = 90 - 84 = 6
  EAN13 ---> 9 780201 134476
*/
export function cleEAN (s) {
  const v = new Array(13)
  for (let i = 0; i < 13; i++) v[i] = s.charCodeAt(i) - 48
  let x = 0
  for (let i = 10; i >= 0; i = i - 2) { x += v[i] }
  let y = 0
  for (let i = 11; i >= 0; i = i - 2) { y += v[i] }
  const z = (3 * y) + x
  const r = z % 10
  let c = 0
  if (r !== 0) {
    const q = Math.floor(z / 10) + 1
    c = (q * 10) - z
  }
  return String.fromCharCode(48 + c)
}

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
    this.canvas = document.createElement('canvas')
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
    change (val) {
      const er = this.checkcb(val)
      if (!er) {
        let cb = val
        if (this.aupoids) {
          const cx = cleEAN(val + '000000')
          cb += '00000' + cx
        }
        setTimeout(() => { this.$refs.input.resetValidation() }, 5)
        const u = this.toBase64Barcode(cb)
        this.img = u
        this.$emit('cb-change', { codebarre: cb, dataURL: u })
      } else {
        this.img = ''
        this.$emit('cb-change', { err: er, codebarre: val })
      }
    },
    checkcb (s) {
      if (typeof s !== 'string' || s.length !== this.nbch || !regChiffres.test(s)) {
        return 'Un code-barre doit être constitué de ' + this.nbch + ' chiffres'
      }
      if (!this.aupoids) {
        const c = cleEAN(s)
        const cx = s.substring(12)
        if (c !== cx) {
          return 'Celle calculée ' + c + ', celle saisie ' + cx
        }
      }
      return ''
    },
    toBase64Barcode (cb) {
      // JsBarcode(this.canvas, text, { format: 'CODE39' })
      JsBarcode(this.canvas, cb, { format: 'EAN13', flat: false, height: 100, width: 3, textMargin: 0, fontOptions: 'bold', fontSize: 32 })
      return this.canvas.toDataURL('image/jpg')
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
