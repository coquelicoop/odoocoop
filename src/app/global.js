export const global = { }
import axios from 'axios'
const cancelSource = axios.CancelToken.source()

export async function loadConfig () {
  const x = await axios.get('./config.json')
  global.config = x.data
  return global.config
}

export function cancelRequest () {
  cancelSource.cancel('Operation interrompue par l\'utilisateur.')
}

export async function get (url) {
  try {
    global.App.setInfo('')
    const r = await axios.get(global.config.odooproxy + url, { responseType: 'blob', cancelToken: cancelSource.token })
    global.App.setInfo('Opération OK')
    return blob2b64(r.data)
  } catch (e) {
    await err(e)
  }
}

export async function post (url, args) {
  try {
    global.App.setInfo('')
    const r = await axios.post(global.config.odooproxy + url, args, { responseType: 'json', cancelToken: cancelSource.token })
    global.App.setInfo('Opération OK')
    return r.data
  } catch (e) {
    await err(e, true)
  }
}

async function err (e, isPost) {
  if (axios.isCancel(e)) {
    global.App.displayErreur({ majeur: "Interruption de l'opération", code: 0, message: e.message })
  } else {
    if (e.response && e.response.status === 400) {
      let x
      if (isPost) {
        x = e.response.data
      } else {
        const err = await this.blob2b64(e.response.data, true)
        try { x = JSON.parse(err) } catch (e2) { x = { c: -1, m: e2.message } }
      }
      global.App.displayErreur({ majeur: "Echec de l'opération", code: x.c, message: x.m })
    } else {
      global.App.displayErreur({ majeur: "Echec de l'opération : BUG ou incident technique", code: 0, message: e.message })
    }
  }
  throw e
}

function blob2b64 (blob, asText) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function () { resolve(reader.result) }
    reader.onerror = function (e) { reject(e) }
    if (asText) { reader.readAsText(blob) } else { reader.readAsDataURL(blob) }
  })
}

const regChiffres = RegExp(/^\d+$/)

export function checkEAN13 (s) {
  if (typeof s !== 'string' || s.length !== 13 || !regChiffres.test(s)) {
    global.App.displayErreur({ majeur: 'Erreur de syntaxe', code: 0, message: 'Un code-barre doit être constitué de 13 chiffres' })
    return false
  }
  const c = cleEAN(s)
  const cx = s.substring(12)
  if (c !== cx) {
    global.App.displayErreur({ majeur: 'Erreur de clé', code: 0, message: 'Celle calculée est ' + c + ', celle saisie est ' + cx })
    return false
  }
  return true
}

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
