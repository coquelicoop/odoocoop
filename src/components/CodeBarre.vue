<template>
  <div style="margin-top:3rem;" class="column items-center">
    <div class="col text-h4">Impression d'une planche de codes barres</div>
    <q-input class="col q-mt-lg" bottom-slots v-model="codebarre" label="Code barre" counter maxlength="13" style="width:30rem">
        <template v-slot:hint>
        13 chiffres
        </template>
    </q-input>
    <q-input class="col q-mt-lg" bottom-slots v-model="fournisseur" label="Code fournisseur à 3 lettres" counter maxlength="3" style="width:30rem">
        <template v-slot:hint>
        3 lettres
        </template>
    </q-input>
    <q-input class="col q-mt-lg" bottom-slots v-model="nom" label="Nom du produit" counter maxlength="30" style="width:30rem">
        <template v-slot:hint>
        de 3 à 30 lettres ou chiffres
        </template>
    </q-input>
    <q-select class="col q-mt-lg" v-model="etiq" :options="etiqs" label="Modèle d'étiquettes" style="width:30rem"/>
    <div class="col q-mt-lg" ><q-btn icon="print" label="IMPRIMER EN PDF" @click="imprimer" /></div>
  </div>
</template>

<script>
import { global, post, checkEAN13, blob2b64 } from '../app/global.js'
import { jsPDF } from 'jspdf'

export default {
  name: 'CodeBarre',
  data () {
    return {
      codebarre: '3254550031046',
      etiq: '',
      etiqs: [],
      fournisseur: 'AAA',
      nom: 'nom du produit',
      erreur: null
    }
  },
  mounted () {
    const t = []
    for (const e in global.config.etiquettes) t.push(e)
    this.etiqs = t
    this.etiq = this.etiqs[0]
  },
  methods: {
    async imprimer () { // 3254550031046
      if (!checkEAN13(this.codebarre)) return
      if (!this.fournisseur || this.fournisseur.length !== 3) {
        global.App.displayErreur({ majeur: 'Erreur de syntaxe', code: 0, message: 'Un code fournisseur doit avoir 3 lettres' })
        return
      }
      if (!this.nom || this.nom.length < 3 || this.nom.length > 30) {
        global.App.displayErreur({ majeur: 'Erreur de syntaxe', code: 0, message: 'Un nom de produit doit avoir entre 3 et 30 signes' })
        return
      }

      global.App.opStart()
      const cfg = global.config.etiquettes[this.etiq]
      try {
        const args = {
          url: '/report/barcode?type=EAN13&width=' + (cfg.cbl * 4) + '&height=' + (cfg.cbh * 4) + '&value=' + this.codebarre,
          type: 'jpg'
        }
        // eslint-disable-next-line
        const res = await post('m1/get_url', args, true)
        this.img = await blob2b64(res)

        // eslint-disable-next-line
        const doc = new jsPDF()
        doc.setFont('fixed')
        doc.setFontSize(9)

        for (let i = 0; i < cfg.nx; i++) {
          for (let j = 0; j < cfg.ny; j++) {
            const x1 = cfg.g + (i * cfg.dx) - 2
            const y1 = cfg.h + (j * cfg.dy) + 2
            const x2 = x1 + 5
            const y2 = y1 + cfg.cbh + 3
            doc.addImage(this.img, 'JPEG', x1, y1, cfg.cbl, cfg.cbh, 'IMG1', 'NONE', 0)
            doc.text(this.codebarre, x2, y2)
          }
        }

        const label = this.fournisseur + ' - ' + this.codebarre + ' - ' + this.nom
        doc.text(label, cfg.g, 290)

        const blob = doc.output('blob')
        const url = URL.createObjectURL(blob)
        window.open(url)
      } catch (e) { }
      global.App.opComplete()
    }
  }
}
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
