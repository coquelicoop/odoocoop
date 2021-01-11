import { global, post } from './global.js'
import { remove } from './accents.js'

export function taxeAchat (id) {
  const n = id && id.length > 0 ? id[0] : 0
  return global.config.taxe_achat && global.config.taxe_achat[n] ? global.config.taxe_achat[n] : 0
}

export function uom (x) {
  return x && x.length === 2 && x[1] === 'kg' ? 'kg' : 'U'
}

/*
trace = 0 - nombre de lignes
trace = 1 - liste des champs
trace = 2 - JSON de la première ligne
*/
export function traceListe (lst, nom, trace) {
  const x = []
  if (!trace) trace = 0
  if (lst && lst.length) {
    console.log('nb de lignes [' + nom + '] : ' + lst.length)
    const obj = lst[0]
    for (const f in obj) x.push(f)
    if (trace >= 1) console.log(nom + ' = ' + JSON.stringify(x))
    if (trace >= 2) console.log(JSON.stringify(obj))
  } else console.log('liste [' + nom + '] vide')
  return x
}

/**********************************************************************
ids : liste des ID des objets product.supllierinfo
fields : champs demandé
const product.supplierinfo = ['id', 'name', 'product_name', 'product_code', 'sequence', 'min_qty', 'company_id', 'currency_id', 'date_start', 'date_end', 'product_id', 'product_tmpl_id', 'delay', 'discount', 'package_qty', 'indicative_package', 'price_policy', 'price', 'is_product_active', 'product_purchase_ok', 'categ_id', 'default_code', 'base_price', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_uom', 'product_variant_count', 'taxes_id', 'supplier_taxes_id', 'price_taxes_excluded', 'price_taxes_included', 'display_name', '__last_update']
*/
export async function supplierinfo (ids, fields) {
  const params = {
    ids: ids,
    domain: [],
    fields: fields,
    order: '',
    limit: 1,
    offset: 0
  }
  return await post('m1/get_by_ids', { model: 'product.supplierinfo', params: params, timeout: 20000 })
}

/*******************************************************************
 * renseigne données supplierinfo à un article
 */
const champsSI = ['name', 'product_code', 'price', 'discount', 'package_qty']
export async function setSupplierinfo (a, fields) {
  a.supplierinfo = []
  a.product_code = ''
  const lst = await supplierinfo(a.seller_ids, fields || champsSI)
  // traceListe(this.liste, 'product.product', 0)
  if (lst && lst.length) {
    for (let i = 0; i < lst.length; i++) a.supplierinfo.push(lst[i])
    a.product_code = lst[0].product_code || ''
  }
  return lst
}

/**********************************************************************
codebarre : code-barre du produit, ou une partie de celui-ci
fields : champs demandés
Si l'argument un est vrai retourne l'article sinon une liste d'articles
product.product = ['id', 'taxes_id', 'product_uom', 'product_id', 'price_unit', 'price_subtotal', 'price_total', 'price_tax', 'state', 'qty_invoiced', 'qty_received', 'discount', 'package_qty', 'indicative_package', 'product_qty_package', 'product_qty', 'price_unit_tax', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_type', 'unit_price', 'package_price', '__last_update']
*/
export async function productsByBarcode (codebarre, un, fields) {
  const params = { // paramètres requis pour le search_read de articles à peser
    ids: [],
    domain: [['barcode', un ? '=' : 'like', codebarre]],
    fields: fields,
    order: '',
    limit: un ? 1 : 9999,
    offset: 0
  }
  const lst = await post('m1/search_read', { model: 'product.product', params: params, timeout: 20000 })
  if (!lst.length) return null
  for (let i = 0; i < lst.length; i++) {
    lst[i].product_code = ''
    lst[i].supplierinfo = []
  }
  return un ? lst[0] : lst
}

/*
id : ID de product (un entier)
fields : liste des champs
retourne l'article (pas une liste)
product.product = ['id', 'taxes_id', 'product_uom', 'product_id', 'price_unit', 'price_subtotal', 'price_total', 'price_tax', 'state', 'qty_invoiced', 'qty_received', 'discount', 'package_qty', 'indicative_package', 'product_qty_package', 'product_qty', 'price_unit_tax', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_type', 'unit_price', 'package_price', '__last_update']
*/
export async function productById (id, fields) {
  const params = {
    ids: [id],
    domain: [],
    fields: fields,
    order: '',
    limit: 1,
    offset: 0
  }
  const lst = await post('m1/get_by_ids', { model: 'product.product', params: params, timeout: 20000 })
  if (!lst.length) return null
  lst[0].product_code = ''
  lst[0].supplierinfo = []
  return lst[0]
}

/*
po : numéro de PO (un entier)
fields : liste des champs
purchase.order = ['id', 'name', 'origin', 'partner_ref', 'date_order', 'date_approve', 'partner_id', 'dest_address_id', 'currency_id', 'state', 'order_line', 'notes', 'invoice_count', 'invoice_ids', 'invoice_status', 'amount_untaxed', 'amount_tax', 'amount_total', 'fiscal_position_id', 'payment_term_id', 'user_id', 'company_id', 'incoterm_id', 'picking_count', 'picking_ids', 'picking_type_id', 'group_id', 'date_planned', 'activity_ids', 'message_follower_ids', 'message_ids', 'message_main_attachment_id', 'website_message_ids', 'access_token', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_id', 'default_location_dest_id_usage', 'is_shipped', 'activity_state', 'activity_user_id', 'activity_type_id', 'activity_date_deadline', 'activity_summary', 'message_is_follower', 'message_partner_ids', 'message_channel_ids', 'message_unread', 'message_unread_counter', 'message_needaction', 'message_needaction_counter', 'message_has_error', 'message_has_error_counter', 'message_attachment_count', 'access_url', 'access_warning', 'display_name', '__last_update']
*/
export async function purchaseOrderById (po, fields) {
  const params = {
    ids: [po],
    domain: [],
    fields: fields,
    order: '',
    limit: 1,
    offset: 0
  }
  const lst = await post('m1/get_by_ids', { model: 'purchase.order', params: params, timeout: 20000 })
  return lst.length >= 1 ? lst[0] : null
}

/*
ids : liste des lignes des order.lines
fields : champs demandés
retourne { lines: [], amount_untaxed_r: 0, amount_tax_r: 0, amount_total_r: 0, aremises: false }
purchase.order.line = ['id', 'name', 'sequence', 'product_uom_qty', 'date_planned', 'taxes_id', 'product_uom', 'product_id', 'price_unit', 'price_subtotal', 'price_total', 'price_tax', 'order_id', 'account_analytic_id', 'analytic_tag_ids', 'company_id', 'state', 'invoice_lines', 'qty_invoiced', 'qty_received', 'partner_id', 'currency_id', 'move_ids', 'orderpoint_id', 'move_dest_ids', 'discount', 'sale_order_id', 'sale_line_id', 'package_qty', 'indicative_package', 'product_qty_package', 'product_qty', 'price_policy', 'operation_extra_id', 'price_unit_tax', 'create_uid', 'create_date', 'write_uid', 'write_date', 'product_image', 'product_type', 'date_order', 'unit_price', 'package_price', 'display_name', '__last_update']
*/
export async function orderlines (ids, fields) {
  const params = {
    ids: ids,
    domain: [],
    fields: fields,
    order: '',
    limit: 1,
    offset: 0
  }
  const lst = await post('m1/get_by_ids', { model: 'purchase.order.line', params: params, timeout: 20000 })
  const e = { amount_untaxed_r: 0, amount_tax_r: 0, amount_total_r: 0, aremises: false }

  if (lst.length) {
    const lf = {}
    for (const f in lst[0]) lf[f] = true
    for (let i = 0; i < lst.length; i++) {
      const lg = lst[i]
      lg.idx = i + 1
      if (lf.discount) {
        const d = 1 + (lg.discount ? lg.discount / 100 : 0)
        if (lg.discount !== 0) e.aremises = true
        if (lf.price_subtotal) {
          lg.price_subtotal_r = lg.price_subtotal * d
          e.amount_untaxed_r += lg.price_subtotal_r
        }
        if (lf.price_tax) {
          lg.price_tax_r = lg.price_tax * d
          e.amount_tax_r += lg.price_tax_r
        }
        if (lf.price_total) {
          lg.price_total_r = lg.price_total * d
          e.amount_total_r += lg.price_total_r
        }
      }
      lg.tva = taxeAchat(lg.taxes_id)
      lg.kg = uom(lg.product_uom)
      lg.nom = lg.product_id[1]
      lg.nomx = remove(lg.nom).toLowerCase()
      lg.dates = 'Maj le ' + lg.write_date + ' par ' + lg.write_uid[1] + ' - Création le ' + lg.create_date + ' par ' + lg.create_uid[1]
    }
    e.lines = lst
    return e
  }
  return null
}
