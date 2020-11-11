import axios from 'axios'
import { remove } from './accents.js'
import JsBarcode from 'jsbarcode'

export const global = { }

let cancelSource

export async function loadConfig () {
  const x = await axios.get('./config.json')
  global.config = x.data
  return global.config
}

export function cancelRequest () {
  cancelSource.cancel('Operation interrompue par l\'utilisateur.')
}

function url (u) { return global.config.odooproxy + '/' + global.env + '/' + u }

export async function get (u) {
  try {
    global.App.setInfo('')
    cancelSource = axios.CancelToken.source()
    const r = await axios.get(url(u), { responseType: 'blob', cancelToken: cancelSource.token })
    global.App.setInfo('Opération OK')
    return blob2b64(r.data)
  } catch (e) {
    await err(e)
  }
}

/*
Envoi une requête POST à odooproxy :
- u est l'URL de la forme "mod/function" qui est la fonction appelée
- args est un objet avec les arguments qui seront transmis dans le body de la requête
Retour :
- OK : l'objet retourné par la fonction demandée
- KO : un objet ayant une propriété error : {c:..., m:..., d:..., s:...}
c : code numétique
m : message textuel
d : détail (fac)
s : stack (fac)
l'erreur a déjà été affichée : le catch dans l'appel sert à différencier la suite du traitement.
*/
export async function post (u, args, blob) {
  try {
    global.App.setInfo('')
    if (!args) args = {}
    args.$username = global.App.username || global.config.username
    args.$password = global.App.password || global.config.password
    cancelSource = axios.CancelToken.source()
    const r = await axios.post(url(u), args, { responseType: blob ? 'blob' : 'json', cancelToken: cancelSource.token })
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
        try { x = JSON.parse(err) } catch (e2) { x = { c: -1, m: err } }
      }
      x = x.apperror || x
      global.App.displayErreur({ majeur: "Echec de l'opération", code: x.c, message: x.m, detail: x.d, stack: x.s })
    } else {
      global.App.displayErreur({ majeur: "Echec de l'opération : BUG ou incident technique", code: 0, message: e.message })
    }
  }
  throw e
}

export function blob2b64 (blob, asText) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = function () {
      resolve(reader.result)
    }
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

export function toBase64Barcode (cb) {
  if (!global.canvas) global.canvas = document.createElement('canvas')
  // JsBarcode(this.canvas, text, { format: 'CODE39' })
  JsBarcode(global.canvas, cb, { format: 'EAN13', flat: false, height: 100, width: 3, textMargin: 0, fontOptions: 'bold', fontSize: 32 })
  return global.canvas.toDataURL('image/jpg')
}

/*
Calcul des codes courts déduits du numéro du produit
On évite des codes courts à deux lettres qui pourraient être des débuts de noms de produits.
On évite les codes courts qui sont affectables explicitement par le gestionnaire des produits pour les pesée en série,
à savoir ceux commençant par W X Y Z
On va donc générer une liste de code courts à partir des 26 lettres selon les règles suivantes :
- deux voyelles de suite : toutefois quelques combinaisons "pourraient" apparaître en début de nom, elles sont exclues.
- deux consonnes de suite : là aussi quelques combinaisons interdites.
*/
// liste des voyelles pouvant apparaître en première et seconde lettres du code court
const v1 = 'AEIOU'
const v2 = 'AEIOUY'

// listes des consommes pouvant apparaître en première et seconde lettres du code court
const c1 = 'BCDFGHJKLMNPQRSTV'
const c2 = 'BCDFGHJKLMNPQRSTVWXZ'

// liste des codes courts qui pouraient appaaraître comme début d'un nom de produit (par exemple 'AI' pour 'Ail' ...)
const non = ['AI', 'AU', 'EU', 'OI', 'OU', 'BL', 'CH', 'FL', 'GL', 'PL', 'SL']

// lisre des codes courts générés
const codes = []

// génération pour ceux commençant par une voyelle et suivi d'une voyelle
for (let i = 0, x1 = ''; (x1 = v1.charAt(i)); i++) {
  for (let j = 0, x2 = ''; (x2 = v2.charAt(j)); j++) {
    const cc = x1 + x2
    if (non.indexOf(cc) === -1) codes.push(cc)
  }
}

// génération pour ceux commençant par une consonne et suivi d'une consonne
for (let i = 0, x1 = ''; (x1 = c1.charAt(i)); i++) {
  for (let j = 0, x2 = ''; (x2 = c2.charAt(j)); j++) {
    const cc = x1 + x2
    if (non.indexOf(cc) === -1) codes.push(cc)
  }
}

/*
Le code court est :
- soit attribué explicitement par le gestionnaire des produits : son nom commence par '[XA]' par exemple où XA est le code court
- soit est celui de rang n dans la liste des codes où n est le reste de la division du numéro de produit (id) par le nombre de codes courts générés.
*/
export function codeCourtDeId (id, nom) {
  const l = nom.indexOf('[')
  return l !== -1 && nom.charAt(l + 3) === ']' ? nom.substring(l + 1, l + 3) : codes[id % codes.length]
}

/* Edition d'un nombre à 2 chiffres avec 0 devant s'il est inférieur à 10 */
function e2 (n) { return e2 === 0 ? '00' : (n < 10 ? '0' + n : '' + n) }

/* Date et heure courante en secpndes sous la forme : 2020-03-21_152135 */
export function dateHeure () {
  const d = new Date()
  return d.getFullYear() + '-' + e2(d.getMonth() + 1) + '-' + e2(d.getDate()) + '_' + e2(d.getHours()) + e2(d.getMinutes()) + e2(d.getSeconds())
}

export function dec (v, n) {
  let x = '' + Math.round(v * [1, 10, 100, 1000, 10000, 100000][n])
  if (x.length <= n) x = '000000'.substring(0, n - x.length + 1) + x
  return x.substring(0, x.length - n) + ',' + x.substring(x.length - n)
}

/* Formate un prix donné par un entier en centimes en euro : 3.61 0.45 */
export function formatPrix (p) {
  if (!p || p < 0) { return '0.00' }
  const e = Math.floor(p / 100)
  const c = Math.round(p % 100)
  return '' + e + '.' + (c > 9 ? c : '0' + c)
}

/*
Formate un poids donné en g :
- soit 5g 15g 125g pour les pods inférieur au kg
- soit 12,430Kg pour les pods supérieurs ou égaux au Kg
*/
export function formatPoids (p) {
  if (!p) return '0'
  if (p < 1000) {
    return p.toString() + 'g'
  }
  const kg = Math.floor(p / 1000)
  const g = Math.round(p % 1000)
  return kg + ',' + ((g < 10 ? '00' : (g < 100 ? '0' : '')) + g) + 'Kg'
  // return '13,457Kg'
}

/*
Retourne la valeur entière number d'un string de n chiffres au plus de long mais non vide.
En cas d'erreur retourne false
*/
export function nChiffres (s, n) {
  if (typeof s !== 'string' || s.length === 0 || s.length > n || !regChiffres.test(s)) return false
  return parseInt(s, 10)
}

/*
En argument s est un string donnant un prix en euros 3.45 0.50 par exemple
Retourne le montant entier en centimes OU false si la syntaxe d'entrée n'est pas valide
*/
export function centimes (s) {
  if (typeof s !== 'string' || s.length === 0) return false
  const i = s.indexOf('.')
  let u = ''
  let c = ''
  if (i === -1) {
    u = s
  } else {
    u = s.substring(0, i)
    c = s.substring(i + 1)
  }
  if (!u) u = '0'
  if (!c) c = '0'
  if (!regChiffres.test(u)) return false
  if (!regChiffres.test(c)) return false
  return Math.round(parseFloat(u + '.' + c) * 100)
}

// liste des colonnes ['id', 'nom', 'code-barre', 'prix', 'categorie', 'unite', 'image']

export function decoreArticles (liste, saufErreur, lgn) {
  // lgn = global.lgnomsuretiquette || 32 // Nombre de caractères max apparaissant sur une ligne d'étiquette
  const res = []
  let nberr = 0
  for (let i = 0; i < liste.length; i++) {
    const data = liste[i]
    data.erreurs = []
    data.nomN = ''
    data.nom1 = ''
    data.nom2 = ''
    data.codeCourt = ''
    data.bio = false
    data.prixN = 0
    data.prixS = '0'

    // id
    try {
      // Le code court est, soit explicité en tête du nom, soit calculé depuis l'id
      const n = nChiffres(data.id, 6)
      if (n === false) {
        data.erreurs.push('id non numérique compris entre 1 et 999999')
      } else {
        data.codeCourt = codeCourtDeId(data.id, data.nom)
      }
    } catch (e) {
      data.erreurs.push('id non numérique compris entre 1 et 999999')
    }

    // nom
    if (!data.nom) {
      data.erreurs.push('nom absent')
      data.nom = ''
    } else {
      /*
      Le code court est, soit explicité en tête du nom, soit calculé depuis l'id
      On détermine aussi si c'est BIO et pour un article à l'unité son poids moyen éventuel
      */
      data.codeCourt = codeCourtDeId(data.id, data.nom)
      data.nomN = remove(data.nom.toUpperCase())
      /*
      Calcule les une ou deux lignes de dénomination du produit apparaissant sur l'étiquette
      Une ligne a un nombre maximal de caractères
      Les mots ne sont pas coupés
      */
      const nom = ['', '']
      let j = 0
      const nx = data.nom.trim().split(' ')
      nx.splice(0, 0, '[' + data.codeCourt + ']')
      for (let i = 0; i < nx.length && j < 2; i++) {
        const m = nx[i]
        if (nom[j].length + m.length + 1 < lgn) {
          if (nom[j].length) {
            nom[j] = nom[j] + ' ' + m
          } else {
            nom[j] = m
          }
        } else {
          j++
          if (j < 2) {
            nom[j] = m
          }
        }
      }
      data.nom1 = nom[0] // Première ligne du nom
      data.nom2 = nom[1] // Seconde ligne du nom
      data.bio = (data.nomN.indexOf('BIO') !== -1)
    }

    // prix
    const e = centimes(data.prix)
    if (e === false) {
      data.erreurs.push('prix absent ou n\'est ni un décimal (avec au plus 2 chiffres après le point), ni un entier')
    } else if (e === 0 || e > 999999) {
      data.erreurs.push('prix en centimes nul ou supérieur à 999999')
    } else {
      data.prixN = e
      data.prix = formatPrix(e)
      data.prixS = '' + e
    }

    // unite
    if (!data.unite || (!data.unite.startsWith('Unit') && data.unite !== 'kg')) {
      data.erreurs.push('unite n\'est ni "Unite(s)" ni "Unité(s)" ni "kg"')
    }
    data.unite = data.unite.startsWith('Unit') ? 'Unite(s)' : 'kg'

    // code-barre
    const s = data['code-barre']
    if (typeof s !== 'string' || s.length !== 13 || !regChiffres.test(s)) {
      data.erreurs.push('code-barre doit être constitué de 13 chiffres')
    } else {
      const c = cleEAN(s)
      const cx = s.substring(12)
      if (c !== cx) {
        data.erreurs.push('code-barre, clé calculée:' + c + ', clé trouvée:' + cx)
      }
    }

    // image
    if (data.image && data.image.length) {
      try {
        const buffer = Buffer.from(data.image, 'base64')
        if (!buffer) { return 'image mal encodée (pas en base64)' }
      } catch (err) {
        data.erreurs.push('image mal encodée (pas en base64)')
      }
    } else data.image = ''

    if (data.erreurs.length) nberr++
    if (!data.erreurs.length || !saufErreur) {
      res.push(data)
      data.idx = res.length
    }
  }
  return [nberr, res]
}
