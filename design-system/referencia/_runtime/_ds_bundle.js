/* @ds-bundle: {"format":4,"namespace":"MetaNutriDesignSystem_38356f","components":[{"name":"Alert","sourcePath":"components/display/Alert.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"Icon","sourcePath":"components/display/Icon.jsx"},{"name":"Progress","sourcePath":"components/display/Progress.jsx"},{"name":"Separator","sourcePath":"components/display/Separator.jsx"},{"name":"Table","sourcePath":"components/display/Table.jsx"},{"name":"Tooltip","sourcePath":"components/display/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"CampoNumero","sourcePath":"components/forms/CampoNumero.jsx"},{"name":"GrupoOpcoes","sourcePath":"components/forms/GrupoOpcoes.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Label","sourcePath":"components/forms/Label.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"EtapasDoCaso","sourcePath":"components/navigation/EtapasDoCaso.jsx"},{"name":"ItemMenu","sourcePath":"components/navigation/ItemMenu.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"BarraAdequacao","sourcePath":"components/nutricao/BarraAdequacao.jsx"},{"name":"CartaoDestaque","sourcePath":"components/nutricao/CartaoDestaque.jsx"},{"name":"MedidorMacro","sourcePath":"components/nutricao/MedidorMacro.jsx"},{"name":"Dialog","sourcePath":"components/overlay/Dialog.jsx"},{"name":"DropdownMenu","sourcePath":"components/overlay/DropdownMenu.jsx"},{"name":"Sheet","sourcePath":"components/overlay/Sheet.jsx"}],"sourceHashes":{"components/display/Alert.jsx":"0acf3ef168f6","components/display/Badge.jsx":"2d84e57a4af8","components/display/Card.jsx":"cb5d8fbb6157","components/display/Icon.jsx":"db59de274e1f","components/display/Progress.jsx":"e8557647ed47","components/display/Separator.jsx":"76d2104700a0","components/display/Table.jsx":"77c85f2c5046","components/display/Tooltip.jsx":"e3f1638306a8","components/forms/Button.jsx":"35ee44a27461","components/forms/CampoNumero.jsx":"bc542ae62ccd","components/forms/GrupoOpcoes.jsx":"1b35617e1959","components/forms/Input.jsx":"d00692426764","components/forms/Label.jsx":"d6a0df3445dc","components/forms/Select.jsx":"190f18dee97f","components/forms/Switch.jsx":"917669810e0a","components/forms/Textarea.jsx":"587bf70b0c32","components/navigation/EtapasDoCaso.jsx":"cf231b3c28db","components/navigation/ItemMenu.jsx":"9e947772635d","components/navigation/Tabs.jsx":"45322e1a4dd5","components/nutricao/BarraAdequacao.jsx":"14c25a3a0dfa","components/nutricao/CartaoDestaque.jsx":"e9cfb224a41a","components/nutricao/MedidorMacro.jsx":"d29a7bdc8eb0","components/overlay/Dialog.jsx":"938d2aeda348","components/overlay/DropdownMenu.jsx":"a0ab0885c16e","components/overlay/Sheet.jsx":"9b2e91243bde","ui_kits/app/Adequacao.jsx":"bda96f5e1ebe","ui_kits/app/App.jsx":"49556289cfbe","ui_kits/app/Painel.jsx":"525904e3db30","ui_kits/app/Plano.jsx":"94ced5856ecb","ui_kits/app/Shell.jsx":"962c67db346a","ui_kits/app/data.js":"e61b744055e4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MetaNutriDesignSystem_38356f = window.MetaNutriDesignSystem_38356f || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Card({
  title,
  description,
  action,
  variant = 'default',
  tight = false,
  className = '',
  children,
  as,
  ...rest
}) {
  const Tag = as || 'section';
  const cls = ['mn-card', variant !== 'default' ? 'mn-card--' + variant : '', tight ? 'mn-card--tight' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(Tag, _extends({
    className: cls
  }, rest), title || action ? /*#__PURE__*/React.createElement("div", {
    className: "mn-card__head"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("h2", {
    className: "mn-card__title"
  }, title) : null, description ? /*#__PURE__*/React.createElement("p", {
    className: "mn-card__desc"
  }, description) : null), action ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0
    }
  }, action) : null) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Lucide icon by kebab-case name. Requires the Lucide UMD global (window.lucide). */
function Icon({
  name,
  size = 16,
  strokeWidth = 1.75,
  color = 'currentColor',
  style,
  title,
  ...rest
}) {
  const lib = typeof window !== 'undefined' ? window.lucide : null;
  const key = String(name || '').split('-').map(function (s) {
    return s ? s[0].toUpperCase() + s.slice(1) : '';
  }).join('');
  let node = lib && lib.icons ? lib.icons[key] : null;
  if (node && node[0] === 'svg') node = node[2];
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": title ? undefined : 'true',
    role: title ? 'img' : undefined,
    style: Object.assign({
      flexShrink: 0,
      display: 'block'
    }, style)
  }, rest), title ? /*#__PURE__*/React.createElement("title", null, title) : null, (node || []).map(function (n, i) {
    return React.createElement(n[0], Object.assign({
      key: i
    }, n[1]));
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Icon.jsx", error: String((e && e.message) || e) }); }

// components/display/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const ICONS = {
  info: 'info',
  warning: 'triangle-alert',
  error: 'circle-alert',
  success: 'circle-check'
};
function Alert({
  variant = 'info',
  title,
  icon,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "status",
    className: 'mn-alert mn-alert--' + variant + ' ' + className
  }, rest), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon || ICONS[variant],
    size: 16,
    style: {
      marginTop: 2
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, title ? /*#__PURE__*/React.createElement("p", {
    className: "mn-alert__title"
  }, title) : null, /*#__PURE__*/React.createElement("div", null, children)));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Alert.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Badge({
  variant = 'neutral',
  dot = false,
  icon,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("span", _extends({
    className: 'mn-badge mn-badge--' + variant + ' ' + className
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "mn-badge__dot"
  }) : null, icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 12,
    strokeWidth: 2
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Progress.jsx
try { (() => {
const COLORS = {
  forest: 'var(--forest-900)',
  lime: 'var(--lime-500)',
  warning: 'var(--state-low)',
  error: 'var(--state-high)',
  info: 'var(--state-info)'
};
function Progress({
  value = 0,
  variant = 'forest',
  height,
  label,
  className = '',
  style
}) {
  const v = Math.max(0, Math.min(100, value));
  return /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": Math.round(v),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-label": label,
    className: 'mn-progress ' + className,
    style: Object.assign({}, height ? {
      height: height
    } : null, style)
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-progress__fill",
    style: {
      width: v + '%',
      background: COLORS[variant] || variant
    }
  }));
}
Object.assign(__ds_scope, { Progress });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Progress.jsx", error: String((e && e.message) || e) }); }

// components/display/Separator.jsx
try { (() => {
function Separator({
  orientation = 'horizontal',
  style
}) {
  const s = orientation === 'vertical' ? {
    width: 1,
    alignSelf: 'stretch'
  } : {
    height: 1,
    width: '100%'
  };
  return /*#__PURE__*/React.createElement("hr", {
    className: "mn-sep",
    "aria-orientation": orientation,
    style: Object.assign(s, style)
  });
}
Object.assign(__ds_scope, { Separator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Separator.jsx", error: String((e && e.message) || e) }); }

// components/display/Table.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Table({
  columns = [],
  rows = [],
  footnotes,
  rowKey,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-table-wrap"
  }, /*#__PURE__*/React.createElement("table", _extends({
    className: 'mn-table ' + className
  }, rest), columns.length ? /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(function (c) {
    return /*#__PURE__*/React.createElement("th", {
      key: c.key,
      style: {
        textAlign: c.align || 'left',
        width: c.width
      }
    }, c.label);
  }))) : null, rows.length ? /*#__PURE__*/React.createElement("tbody", null, rows.map(function (r, i) {
    return /*#__PURE__*/React.createElement("tr", {
      key: rowKey ? r[rowKey] : i
    }, columns.map(function (c) {
      return /*#__PURE__*/React.createElement("td", {
        key: c.key,
        className: c.numeric ? 'mn-num' : undefined,
        style: {
          textAlign: c.align || 'left',
          whiteSpace: c.nowrap ? 'nowrap' : undefined
        }
      }, r[c.key]);
    }));
  })) : children)), footnotes ? /*#__PURE__*/React.createElement("div", {
    className: "mn-table__foot"
  }, footnotes) : null);
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Table.jsx", error: String((e && e.message) || e) }); }

// components/display/Tooltip.jsx
try { (() => {
function Tooltip({
  content,
  side = 'top',
  children
}) {
  return /*#__PURE__*/React.createElement("span", {
    className: "mn-tip",
    tabIndex: 0
  }, children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    className: 'mn-tip__bubble' + (side === 'bottom' ? ' mn-tip__bubble--bottom' : '')
  }, content));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const iconOnly = !children && (icon || iconRight);
  const cls = ['mn-btn', 'mn-btn--' + variant, size !== 'md' ? 'mn-btn--' + size : '', iconOnly ? 'mn-btn--icon' : '', block ? 'mn-btn--block' : '', className].filter(Boolean).join(' ');
  const s = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls
  }, rest), icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s
  }) : null, children, iconRight ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/GrupoOpcoes.jsx
try { (() => {
/** Single-choice segmented group (radiogroup). */
function GrupoOpcoes({
  rotulo,
  opcoes = [],
  valor,
  aoEscolher,
  block = false,
  rotuloOculto = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-field"
  }, rotulo && !rotuloOculto ? /*#__PURE__*/React.createElement("span", {
    className: "mn-label"
  }, rotulo) : null, /*#__PURE__*/React.createElement("div", {
    role: "radiogroup",
    "aria-label": rotulo,
    className: 'mn-seg' + (block ? ' mn-seg--block' : '')
  }, opcoes.map(function (o) {
    return /*#__PURE__*/React.createElement("button", {
      key: o.valor,
      type: "button",
      role: "radio",
      "aria-checked": o.valor === valor ? 'true' : 'false',
      className: "mn-seg__opt",
      onClick: function () {
        if (aoEscolher) aoEscolher(o.valor);
      }
    }, o.rotulo);
  })));
}
Object.assign(__ds_scope, { GrupoOpcoes });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/GrupoOpcoes.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let seq = 0;
function Input({
  label,
  hint,
  error,
  icon,
  suffix,
  variant = 'default',
  size = 'md',
  id,
  className = '',
  style,
  numeric = false,
  ...rest
}) {
  const autoId = React.useMemo(function () {
    seq += 1;
    return 'mn-in-' + seq;
  }, []);
  const fid = id || autoId;
  const cls = ['mn-input', variant === 'sunken' ? 'mn-input--sunken' : '', size === 'sm' ? 'mn-input--sm' : '', numeric ? 'mn-input--num' : '', className].filter(Boolean).join(' ');
  const pad = {};
  if (icon) pad.paddingLeft = 38;
  if (suffix) pad.paddingRight = 16 + String(suffix).length * 8;
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-field",
    style: style
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "mn-label",
    htmlFor: fid
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    className: "mn-input-wrap"
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "mn-input-icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 16
  })) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    className: cls,
    style: pad,
    "aria-invalid": error ? 'true' : undefined,
    autoComplete: "off"
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    className: "mn-input-suffix"
  }, suffix) : null), error ? /*#__PURE__*/React.createElement("span", {
    className: "mn-hint mn-hint--error"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "mn-hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/CampoNumero.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Number field that parses pt-BR decimals ("62,5") and reports null when empty. */
function CampoNumero({
  rotulo,
  valor,
  aoMudar,
  sufixo,
  dica,
  rotuloOculto = false,
  size = 'md',
  ...rest
}) {
  const [texto, setTexto] = React.useState(valor == null ? '' : String(valor).replace('.', ','));
  React.useEffect(function () {
    setTexto(valor == null ? '' : String(valor).replace('.', ','));
  }, [valor]);
  return /*#__PURE__*/React.createElement(__ds_scope.Input, _extends({
    label: rotuloOculto ? undefined : rotulo,
    "aria-label": rotuloOculto ? rotulo : undefined,
    hint: dica,
    suffix: sufixo,
    numeric: true,
    size: size,
    inputMode: "decimal",
    value: texto,
    onChange: function (e) {
      setTexto(e.target.value);
      const t = e.target.value.trim().replace(',', '.');
      const n = t === '' ? null : Number(t);
      if (aoMudar && (n === null || !isNaN(n))) aoMudar(n);
    }
  }, rest));
}
Object.assign(__ds_scope, { CampoNumero });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/CampoNumero.jsx", error: String((e && e.message) || e) }); }

// components/forms/Label.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Label({
  children,
  hint,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("label", _extends({
    className: 'mn-label ' + className
  }, rest), children, hint ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 400,
      color: 'var(--text-muted)',
      marginLeft: 6
    }
  }, hint) : null);
}
Object.assign(__ds_scope, { Label });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Label.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Select({
  label,
  hint,
  options = [],
  placeholder,
  id,
  size = 'md',
  className = '',
  ...rest
}) {
  const fid = id || (label ? 'mn-sel-' + label.replace(/\W+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-field"
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "mn-label",
    htmlFor: fid
  }, label) : null, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    className: ['mn-input', 'mn-select', size === 'sm' ? 'mn-input--sm' : '', className].join(' ')
  }, rest), placeholder ? /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder) : null, options.map(function (o) {
    const v = typeof o === 'string' ? o : o.value;
    const l = typeof o === 'string' ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), hint ? /*#__PURE__*/React.createElement("span", {
    className: "mn-hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Switch({
  checked = false,
  onChange,
  label,
  disabled,
  id,
  ...rest
}) {
  const btn = /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    role: "switch",
    id: id,
    "aria-checked": checked ? 'true' : 'false',
    "aria-label": label,
    disabled: disabled,
    className: "mn-switch",
    onClick: function () {
      if (onChange) onChange(!checked);
    }
  }, rest));
  if (!label) return btn;
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      font: 'var(--type-body)',
      color: 'var(--text-body)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), btn);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Textarea({
  label,
  hint,
  id,
  className = '',
  rows = 4,
  ...rest
}) {
  const fid = id || (label ? 'mn-ta-' + label.replace(/\W+/g, '-').toLowerCase() : undefined);
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-field"
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "mn-label",
    htmlFor: fid
  }, label) : null, /*#__PURE__*/React.createElement("textarea", _extends({
    id: fid,
    rows: rows,
    className: 'mn-input mn-textarea ' + className
  }, rest)), hint ? /*#__PURE__*/React.createElement("span", {
    className: "mn-hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/EtapasDoCaso.jsx
try { (() => {
const ETAPAS = [{
  aba: 'caso',
  numero: 1,
  rotulo: 'Dados e medidas',
  descricao: 'Pessoa, medidas e energia'
}, {
  aba: 'plano',
  numero: 2,
  rotulo: 'Plano alimentar',
  descricao: 'Refeições e alimentos'
}, {
  aba: 'adequacao',
  numero: 3,
  rotulo: 'Adequação',
  descricao: 'Vitaminas e minerais'
}];
function EtapasDoCaso({
  abaAtual = 'caso',
  aoEscolher,
  etapas = ETAPAS,
  compact = false
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Etapas do plano"
  }, /*#__PURE__*/React.createElement("ol", {
    className: 'mn-steps' + (compact ? ' mn-steps--compact' : '')
  }, etapas.map(function (e) {
    const atual = e.aba === abaAtual;
    return /*#__PURE__*/React.createElement("li", {
      key: e.aba,
      style: {
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      className: "mn-step",
      "aria-current": atual ? 'step' : undefined,
      onClick: function () {
        if (aoEscolher) aoEscolher(e.aba);
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mn-step__num",
      "aria-hidden": "true"
    }, e.numero), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mn-step__label"
    }, e.rotulo), /*#__PURE__*/React.createElement("span", {
      className: "mn-step__desc"
    }, e.descricao))));
  })));
}
Object.assign(__ds_scope, { EtapasDoCaso });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/EtapasDoCaso.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ItemMenu.jsx
try { (() => {
function ItemMenu({
  icone,
  rotulo,
  detalhe,
  extra,
  ativo = false,
  aoClicar
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "mn-navitem",
    "aria-current": ativo ? 'page' : undefined,
    onClick: aoClicar
  }, icone ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icone,
    size: 18
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "mn-navitem__text"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, rotulo), detalhe ? /*#__PURE__*/React.createElement("span", {
    className: "mn-navitem__detail"
  }, detalhe) : null), extra != null ? /*#__PURE__*/React.createElement("span", {
    className: "mn-navitem__extra"
  }, extra) : null);
}
Object.assign(__ds_scope, { ItemMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ItemMenu.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function Tabs({
  items = [],
  value,
  onChange,
  variant = 'underline',
  fill = false,
  label
}) {
  if (variant === 'pill') {
    return /*#__PURE__*/React.createElement("div", {
      role: "tablist",
      "aria-label": label,
      className: 'mn-seg' + (fill ? ' mn-seg--block' : '')
    }, items.map(function (t) {
      return /*#__PURE__*/React.createElement("button", {
        key: t.value,
        type: "button",
        role: "tab",
        "aria-selected": t.value === value ? 'true' : 'false',
        className: "mn-seg__opt",
        onClick: function () {
          if (onChange) onChange(t.value);
        }
      }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
        name: t.icon,
        size: 14
      }) : null, t.label);
    }));
  }
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    "aria-label": label,
    className: 'mn-tabs' + (fill ? ' mn-tabs--fill' : '')
  }, items.map(function (t) {
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      type: "button",
      role: "tab",
      "aria-selected": t.value === value ? 'true' : 'false',
      className: "mn-tab",
      onClick: function () {
        if (onChange) onChange(t.value);
      }
    }, t.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: t.icon,
      size: 14
    }) : null, t.label, t.count != null ? /*#__PURE__*/React.createElement("span", {
      className: "mn-tab__count"
    }, t.count) : null);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/nutricao/BarraAdequacao.jsx
try { (() => {
function estadoDe(pct, temLimite) {
  if (pct == null) return 'semdado';
  if (temLimite && pct > 100) return 'acima';
  if (pct >= 100) return 'dentro';
  return 'abaixo';
}
const FILL = {
  dentro: 'var(--state-ok)',
  abaixo: 'var(--state-low)',
  acima: 'var(--state-high)'
};
const TXT = {
  dentro: 'var(--text-strong)',
  abaixo: 'var(--state-low-text)',
  acima: 'var(--state-high-text)',
  semdado: 'var(--text-muted)'
};
function BarraAdequacao({
  nome,
  detalhe,
  pct = null,
  fonte,
  temLimite = false,
  marca,
  estado
}) {
  const e = estado || estadoDe(pct, temLimite);
  const largura = pct == null ? 100 : Math.min(pct, 160) / 1.6;
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-meter"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-meter__name"
  }, nome, marca ? /*#__PURE__*/React.createElement("sup", {
    className: "mn-mark mn-mark--warn"
  }, marca) : null), /*#__PURE__*/React.createElement("span", {
    className: "mn-meter__val",
    style: {
      color: TXT[e]
    }
  }, pct == null ? 'sem dado' : pct + '%')), /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__track",
    role: "img",
    "aria-label": nome + ': ' + (pct == null ? 'a tabela de composição não traz este nutriente' : pct + '% da meta')
  }, e === 'semdado' ? /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__nodata"
  }) : /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__fill",
    style: {
      width: largura + '%',
      background: FILL[e]
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      left: '62.5%',
      top: -3,
      bottom: -3,
      width: 2,
      borderRadius: 2,
      background: 'var(--forest-900)',
      opacity: .25
    }
  })), detalhe || fonte ? /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__foot"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-num"
  }, detalhe), /*#__PURE__*/React.createElement("span", null, fonte)) : null);
}
Object.assign(__ds_scope, { BarraAdequacao });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutricao/BarraAdequacao.jsx", error: String((e && e.message) || e) }); }

// components/nutricao/CartaoDestaque.jsx
try { (() => {
function CartaoDestaque({
  rotulo,
  valor,
  unidade,
  apoio,
  icone,
  tom = 'branco',
  aoClicar,
  children
}) {
  const Tag = aoClicar ? 'button' : 'div';
  const cls = 'mn-stat' + (tom === 'branco' ? '' : ' mn-stat--' + tom);
  return /*#__PURE__*/React.createElement(Tag, {
    className: cls,
    type: aoClicar ? 'button' : undefined,
    onClick: aoClicar
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-stat__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__label"
  }, rotulo), icone ? /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__icon"
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icone,
    size: 16
  })) : null), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__value"
  }, valor), unidade ? /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__unit"
  }, unidade) : null), apoio ? /*#__PURE__*/React.createElement("p", {
    className: "mn-stat__apoio"
  }, apoio) : null, children);
}
Object.assign(__ds_scope, { CartaoDestaque });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutricao/CartaoDestaque.jsx", error: String((e && e.message) || e) }); }

// components/nutricao/MedidorMacro.jsx
try { (() => {
const COR = {
  dentro: 'var(--forest-900)',
  abaixo: 'var(--state-low)',
  acima: 'var(--state-high)'
};
const FRASE = {
  dentro: 'var(--state-ok-text)',
  abaixo: 'var(--state-low-text)',
  acima: 'var(--state-high-text)'
};
function MedidorMacro({
  nome,
  valores,
  faixaInicio,
  faixaFim,
  posicao,
  estado = 'dentro',
  frase,
  meta
}) {
  const tem = posicao != null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-meter",
    style: {
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-meter__name"
  }, nome), /*#__PURE__*/React.createElement("span", {
    className: "mn-meter__val",
    style: {
      color: 'var(--text-strong)'
    }
  }, valores)), tem ? /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__track",
    role: "img",
    "aria-label": nome + ': ' + (frase || '')
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__band",
    style: {
      left: faixaInicio + '%',
      width: Math.max(faixaFim - faixaInicio, 1) + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__marker",
    style: {
      left: Math.max(0, Math.min(100, posicao)) + '%',
      background: COR[estado]
    }
  })) : null, /*#__PURE__*/React.createElement("div", {
    className: "mn-meter__foot"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: tem ? FRASE[estado] : undefined,
      fontWeight: 500
    }
  }, tem ? frase : meta || 'Sem meta: informe a idade ou defina uma meta.'), tem && meta ? /*#__PURE__*/React.createElement("span", null, meta) : null));
}
Object.assign(__ds_scope, { MedidorMacro });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/nutricao/MedidorMacro.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Dialog.jsx
try { (() => {
function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  width
}) {
  React.useEffect(function () {
    if (!open) return;
    function k(e) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    window.addEventListener('keydown', k);
    return function () {
      window.removeEventListener('keydown', k);
    };
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-overlay",
    onMouseDown: function (e) {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    className: "mn-dialog",
    style: width ? {
      maxWidth: width
    } : undefined
  }, /*#__PURE__*/React.createElement("div", null, title ? /*#__PURE__*/React.createElement("h2", {
    className: "mn-dialog__title"
  }, title) : null, description ? /*#__PURE__*/React.createElement("p", {
    className: "mn-dialog__desc"
  }, description) : null), /*#__PURE__*/React.createElement("span", {
    className: "mn-dialog__close"
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    icon: "x",
    "aria-label": "Fechar",
    onClick: onClose
  })), children, footer ? /*#__PURE__*/React.createElement("div", {
    className: "mn-dialog__foot"
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/overlay/DropdownMenu.jsx
try { (() => {
function DropdownMenu({
  trigger,
  items = [],
  align = 'end'
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(function () {
    if (!open) return;
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function k(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', h);
    window.addEventListener('keydown', k);
    return function () {
      document.removeEventListener('mousedown', h);
      window.removeEventListener('keydown', k);
    };
  }, [open]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-menu",
    ref: ref
  }, /*#__PURE__*/React.createElement("span", {
    onClick: function () {
      setOpen(!open);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open
  }, trigger), open ? /*#__PURE__*/React.createElement("div", {
    role: "menu",
    className: 'mn-menu__list mn-menu__list--' + align
  }, items.map(function (it, i) {
    if (it.separator) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "mn-menu__sep"
    });
    if (it.heading) return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "mn-menu__label"
    }, it.heading);
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      role: "menuitem",
      className: 'mn-menu__item' + (it.danger ? ' mn-menu__item--danger' : ''),
      onClick: function () {
        setOpen(false);
        if (it.onSelect) it.onSelect();
      }
    }, it.icon ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
      name: it.icon,
      size: 16
    }) : null, /*#__PURE__*/React.createElement("span", null, it.label), it.hint ? /*#__PURE__*/React.createElement("span", {
      className: "mn-menu__hint"
    }, it.hint) : null);
  })) : null);
}
Object.assign(__ds_scope, { DropdownMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/DropdownMenu.jsx", error: String((e && e.message) || e) }); }

// components/overlay/Sheet.jsx
try { (() => {
function Sheet({
  open,
  onClose,
  side = 'right',
  title,
  description,
  children,
  contained = false
}) {
  React.useEffect(function () {
    if (!open) return;
    function k(e) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    window.addEventListener('keydown', k);
    return function () {
      window.removeEventListener('keydown', k);
    };
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-overlay",
    style: contained ? {
      position: 'absolute'
    } : undefined,
    onMouseDown: function (e) {
      if (e.target === e.currentTarget && onClose) onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    className: 'mn-sheet mn-sheet--' + side
  }, side === 'bottom' ? /*#__PURE__*/React.createElement("div", {
    className: "mn-sheet__grab"
  }) : null, title ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "mn-dialog__title",
    style: {
      paddingRight: 0
    }
  }, title), description ? /*#__PURE__*/React.createElement("p", {
    className: "mn-dialog__desc"
  }, description) : null), /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "ghost",
    size: "sm",
    icon: "x",
    "aria-label": "Fechar",
    onClick: onClose
  })) : null, children));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlay/Sheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Adequacao.jsx
try { (() => {
const {
  Card: ACard,
  Button: AButton,
  Badge: ABadge,
  Progress: AProgress,
  Table: ATable,
  Tooltip: ATip,
  Sheet: ASheet,
  GrupoOpcoes: AGrupo,
  Switch: ASwitch,
  CampoNumero: ANum,
  Select: ASelect,
  BarraAdequacao,
  Alert: AAlert
} = window.MetaNutriDesignSystem_38356f;
const VAR = {
  adequado: 'success',
  abaixo: 'warning',
  'acima-limite': 'error'
};
const ROT = {
  adequado: 'Adequado',
  abaixo: 'Abaixo da meta',
  'acima-limite': 'Acima do limite superior'
};
const PROG = {
  adequado: 'lime',
  abaixo: 'warning',
  'acima-limite': 'error'
};
function Marcas({
  l
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, l.semDado ? /*#__PURE__*/React.createElement(ATip, {
    content: l.semDado + (l.semDado === 1 ? ' alimento do plano não tem' : ' alimentos do plano não têm') + ' este nutriente na tabela: total possivelmente subestimado.'
  }, /*#__PURE__*/React.createElement("abbr", {
    className: "mn-mark mn-mark--warn",
    style: {
      textDecoration: 'none'
    }
  }, "\u2020")) : null);
}
function GavetaCobrir({
  chave,
  rotulo,
  mobile,
  aoFechar,
  aoAdicionar,
  plano
}) {
  const [refeicao, setRefeicao] = React.useState(plano[0].id);
  const [cru, setCru] = React.useState(false);
  const [ocultos, setOcultos] = React.useState([]);
  const d = chave ? window.MN_COBRIR[chave] : null;
  return /*#__PURE__*/React.createElement(ASheet, {
    open: !!chave,
    side: mobile ? 'bottom' : 'right',
    onClose: aoFechar,
    title: 'Cobrir ' + rotulo,
    description: d ? 'Faltam ' + d.falta + ' para a meta. Cabem ' + d.kcal + ' kcal até o gasto energético.' : ''
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 14,
      background: 'var(--surface-sunken)',
      borderRadius: 14
    }
  }, /*#__PURE__*/React.createElement(ANum, {
    rotulo: "Por\xE7\xE3o m\xE1xima por sugest\xE3o",
    valor: 200,
    sufixo: "g",
    size: "sm"
  }), /*#__PURE__*/React.createElement(ASwitch, {
    label: "Incluir ingredientes e alimentos crus",
    checked: cru,
    onChange: setCru
  })), /*#__PURE__*/React.createElement(ASelect, {
    label: "Adicionar em",
    value: refeicao,
    onChange: e => setRefeicao(e.target.value),
    options: plano.map(r => ({
      value: r.id,
      label: r.horario + ' ' + r.nome
    }))
  }), /*#__PURE__*/React.createElement("ul", {
    "aria-label": "Sugest\xF5es para cobrir",
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, (d ? d.s : []).filter(s => ocultos.indexOf(s[0]) < 0).map(([k, g, cob]) => {
    const a = window.MN_ALIMENTOS[k];
    return /*#__PURE__*/React.createElement("li", {
      key: k,
      style: {
        border: '1px solid var(--border-subtle)',
        borderRadius: 14,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: 10,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        font: '600 14px/1.3 var(--font-sans)',
        color: 'var(--forest-900)'
      }
    }, a.d), /*#__PURE__*/React.createElement("p", {
      className: "mn-num",
      style: {
        font: '400 12px/1.4 var(--font-data)',
        color: 'var(--text-muted)',
        marginTop: 2
      }
    }, window.mnMedida(k, g), " \xB7 +", window.mnFmt(a.kcal * g / 100), " kcal")), /*#__PURE__*/React.createElement(ABadge, {
      variant: "accent"
    }, "cobre ", cob, "%")), /*#__PURE__*/React.createElement(AProgress, {
      value: cob,
      variant: "lime",
      height: 6,
      label: 'Cobre ' + cob + '% da falta'
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(AButton, {
      size: "sm",
      icon: "plus",
      onClick: () => aoAdicionar(refeicao, k, g)
    }, "Adicionar"), /*#__PURE__*/React.createElement(AButton, {
      size: "sm",
      variant: "ghost",
      icon: "eye-off",
      onClick: () => setOcultos(ocultos.concat([k]))
    }, "Nunca sugerir")));
  })));
}
function TelaAdequacao({
  mobile,
  plano,
  aoAdicionar
}) {
  const [preset, setPreset] = React.useState('individual');
  const [cobrindo, setCobrindo] = React.useState(null);
  const linhas = window.MN_ADEQUACAO;
  const abaixo = linhas.filter(l => l.estado === 'abaixo').length;
  const cobrir = l => setCobrindo(l);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: mobile ? 16 : 24
    }
  }, /*#__PURE__*/React.createElement(ACard, {
    title: "Refer\xEAncia da adequa\xE7\xE3o",
    description: "Individual usa a RDA; coletivo usa a EAR. Nutrientes sem esses valores usam a AI."
  }, /*#__PURE__*/React.createElement(AGrupo, {
    rotulo: "Tipo de refer\xEAncia",
    rotuloOculto: true,
    block: mobile,
    valor: preset,
    aoEscolher: setPreset,
    opcoes: [{
      valor: 'individual',
      rotulo: mobile ? 'Individual' : 'Individual (RDA, 90%)'
    }, {
      valor: 'coletivo',
      rotulo: mobile ? 'Coletivo' : 'Coletivo (EAR, 50%)'
    }, {
      valor: 'personalizado',
      rotulo: 'Personalizado'
    }]
  })), /*#__PURE__*/React.createElement(ACard, {
    title: "Micronutrientes",
    description: "Est\xE1gio de vida: mulheres de 19 a 30 anos",
    action: /*#__PURE__*/React.createElement(ABadge, {
      variant: "warning"
    }, abaixo, " abaixo da meta")
  }, mobile ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, linhas.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.k,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      paddingBottom: 14,
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement(BarraAdequacao, {
    nome: l.n,
    pct: l.pct,
    marca: l.semDado ? '†' : undefined,
    temLimite: l.estado === 'acima-limite',
    estado: l.estado === 'adequado' ? 'dentro' : l.estado === 'abaixo' ? 'abaixo' : 'acima',
    detalhe: l.v + ' de ' + l.ref,
    fonte: l.tipo
  }), l.estado === 'abaixo' && window.MN_COBRIR[l.k] ? /*#__PURE__*/React.createElement(AButton, {
    size: "sm",
    variant: "soft",
    icon: "sparkles",
    onClick: () => cobrir(l),
    style: {
      alignSelf: 'flex-start'
    }
  }, "Cobrir ", l.n.toLowerCase()) : null)), /*#__PURE__*/React.createElement(BarraAdequacao, {
    nome: "Vitamina D",
    pct: null,
    fonte: "N\xE3o existe na TACO"
  })) : /*#__PURE__*/React.createElement(ATable, {
    columns: [{
      key: 'n',
      label: 'Nutriente'
    }, {
      key: 'v',
      label: 'No plano',
      numeric: true,
      nowrap: true
    }, {
      key: 'r',
      label: 'Referência',
      numeric: true,
      nowrap: true
    }, {
      key: 'a',
      label: 'Adequação',
      width: 180
    }, {
      key: 'e',
      label: 'Estado'
    }, {
      key: 'x',
      label: '',
      align: 'right'
    }],
    rows: linhas.map(l => ({
      n: /*#__PURE__*/React.createElement("span", {
        style: {
          fontWeight: 600,
          color: 'var(--forest-900)'
        }
      }, l.n, l.limite ? /*#__PURE__*/React.createElement("abbr", {
        className: "mn-mark mn-mark--muted",
        title: "O limite superior n\xE3o vale para a forma do nutriente presente nos alimentos.",
        style: {
          textDecoration: 'none'
        }
      }, "\u2021") : null),
      v: /*#__PURE__*/React.createElement("span", null, l.v, /*#__PURE__*/React.createElement(Marcas, {
        l: l
      })),
      r: /*#__PURE__*/React.createElement("span", null, l.ref, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, l.tipo)),
      a: /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(AProgress, {
        value: l.pct,
        variant: PROG[l.estado]
      }), /*#__PURE__*/React.createElement("span", {
        className: "mn-num",
        style: {
          display: 'block',
          marginTop: 5,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, l.pct, "% (meta ", preset === 'coletivo' ? 50 : 90, "%)")),
      e: /*#__PURE__*/React.createElement(ABadge, {
        variant: VAR[l.estado]
      }, ROT[l.estado]),
      x: l.estado === 'abaixo' && window.MN_COBRIR[l.k] ? /*#__PURE__*/React.createElement(AButton, {
        size: "sm",
        variant: "soft",
        icon: "sparkles",
        onClick: () => cobrir(l)
      }, "Cobrir") : null
    })),
    footnotes: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
      className: "mn-mark mn-mark--warn"
    }, "\u2020"), " Total possivelmente subestimado: algum alimento do plano n\xE3o tem esse nutriente na tabela de composi\xE7\xE3o. Falta de dado nunca entra como zero."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("span", {
      className: "mn-mark mn-mark--muted"
    }, "\u2021"), " O limite superior da tabela n\xE3o vale para a forma do nutriente presente nos alimentos."), /*#__PURE__*/React.createElement("p", null, "Composi\xE7\xE3o: NEPA/UNICAMP. TACO, 4\xAA edi\xE7\xE3o, 2011 \xB7 Refer\xEAncias de ingest\xE3o: NASEM. DRI, 2019"))
  })), /*#__PURE__*/React.createElement(GavetaCobrir, {
    chave: cobrindo ? cobrindo.k : null,
    rotulo: cobrindo ? cobrindo.n.toLowerCase() : '',
    mobile: mobile,
    plano: plano,
    aoFechar: () => setCobrindo(null),
    aoAdicionar: (rid, k, g) => {
      aoAdicionar(rid, k, g);
      setCobrindo(null);
    }
  }));
}
window.TelaAdequacao = TelaAdequacao;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Adequacao.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/App.jsx
try { (() => {
const {
  Sheet: RSheet,
  EtapasDoCaso,
  Alert: RAlert,
  Button: RButton
} = window.MetaNutriDesignSystem_38356f;
function useLargura(ref) {
  const [w, setW] = React.useState(1440);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return w;
}
const TITULOS = {
  painel: ['Painel', 'O que precisa de atenção, onde você parou e o que fazer agora.'],
  pacientes: ['Pacientes'],
  casos: ['Planos'],
  alimentos: ['Tabela de alimentos'],
  produtos: ['Meus produtos'],
  conta: ['Conta e plano'],
  config: ['Configurações'],
  ajuda: ['Ajuda']
};
function App({
  inicial
}) {
  const ref = React.useRef(null);
  const largura = useLargura(ref);
  const mobile = largura < 1024;
  const salvo = inicial ? null : (() => {
    try {
      return JSON.parse(localStorage.getItem('mn-kit-rota') || 'null');
    } catch (e) {
      return null;
    }
  })();
  const [rota, setRota] = React.useState(salvo && salvo.rota || inicial || 'painel');
  const [aba, setAba] = React.useState(salvo && salvo.aba || 'plano');
  const [menu, setMenu] = React.useState(false);
  const [plano, setPlano] = React.useState(window.MN_PLANO_INICIAL);
  const [aviso, setAviso] = React.useState(null);
  React.useEffect(() => {
    if (!inicial) localStorage.setItem('mn-kit-rota', JSON.stringify({
      rota,
      aba
    }));
  }, [rota, aba]);
  const ir = r => {
    setRota(r);
    setMenu(false);
    if (ref.current) ref.current.scrollTop = 0;
  };
  const abrirPlano = () => {
    setAba('plano');
    ir('planejador');
  };
  const adicionar = (rid, k, g) => {
    setPlano(plano.map(r => r.id === rid ? Object.assign({}, r, {
      principal: r.principal.concat([[k, g]])
    }) : r));
    setAviso(window.MN_ALIMENTOS[k].d + ' entrou em ' + plano.find(r => r.id === rid).nome + '.');
  };
  let titulo, subtitulo, trilha, acoes, corpo;
  if (rota === 'planejador') {
    titulo = 'Ana Souza — retorno';
    subtitulo = 'Atendimento completo · salvo agora';
    trilha = [{
      rotulo: 'Planos',
      aoClicar: () => ir('casos')
    }];
    acoes = /*#__PURE__*/React.createElement(MenuExportar, {
      mobile: mobile
    });
    corpo = /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: mobile ? 16 : 24
      }
    }, /*#__PURE__*/React.createElement(EtapasDoCaso, {
      abaAtual: aba,
      aoEscolher: setAba,
      compact: largura < 640
    }), aviso ? /*#__PURE__*/React.createElement(RAlert, {
      variant: "success",
      title: "Adicionado"
    }, aviso, " ", /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => {
        setAba('plano');
        setAviso(null);
      },
      style: {
        border: 0,
        background: 'none',
        padding: 0,
        font: 'inherit',
        color: 'inherit',
        textDecoration: 'underline',
        cursor: 'pointer'
      }
    }, "Ver no plano")) : null, aba === 'caso' ? /*#__PURE__*/React.createElement(TelaCaso, {
      mobile: mobile
    }) : aba === 'plano' ? /*#__PURE__*/React.createElement(TelaPlano, {
      mobile: mobile,
      plano: plano,
      setPlano: setPlano
    }) : /*#__PURE__*/React.createElement(TelaAdequacao, {
      mobile: mobile,
      plano: plano,
      aoAdicionar: adicionar
    }));
  } else {
    const t = TITULOS[rota] || ['MetaNutri'];
    titulo = t[0];
    subtitulo = t[1];
    corpo = rota === 'painel' ? /*#__PURE__*/React.createElement(TelaPainel, {
      mobile: mobile,
      abrirPlano: abrirPlano,
      aoNovo: abrirPlano,
      ir: ir
    }) : /*#__PURE__*/React.createElement(TelaVazia, {
      titulo: titulo
    });
  }
  const menuEl = /*#__PURE__*/React.createElement(MenuLateral, {
    rota: rota,
    ir: ir,
    casoAtual: "Ana Souza \u2014 retorno",
    aoNovo: abrirPlano
  });
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-screen-label": rota === 'planejador' ? 'Plano · ' + aba : rota,
    style: {
      position: 'relative',
      height: '100%',
      overflowY: 'auto',
      background: 'var(--bg-page)',
      display: 'grid',
      gridTemplateColumns: mobile ? 'minmax(0,1fr)' : '264px minmax(0,1fr)'
    }
  }, !mobile ? /*#__PURE__*/React.createElement("aside", {
    style: {
      position: 'sticky',
      top: 0,
      height: '100vh',
      maxHeight: '100%'
    }
  }, menuEl) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Cabecalho, {
    titulo: titulo,
    subtitulo: subtitulo,
    trilha: trilha,
    acoes: acoes,
    mobile: mobile,
    aoAbrirMenu: () => setMenu(true)
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      padding: mobile ? '16px 16px 32px' : '24px 24px 48px'
    }
  }, corpo)), mobile ? /*#__PURE__*/React.createElement(RSheet, {
    open: menu,
    side: "left",
    onClose: () => setMenu(false)
  }, menuEl) : null);
}
window.App = App;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Painel.jsx
try { (() => {
const {
  Card: PCard,
  CartaoDestaque,
  Button: PButton,
  Icon: PIcon,
  Tabs: PTabs
} = window.MetaNutriDesignSystem_38356f;
function GraficoAtividade({
  dias
}) {
  const maior = Math.max.apply(null, dias.concat([1]));
  const rot = ['11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', 'Hoje'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
      height: 150,
      paddingTop: 8
    }
  }, dias.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      height: '100%',
      justifyContent: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-num",
    style: {
      fontSize: 11,
      color: 'var(--text-muted)',
      opacity: d ? 1 : 0
    }
  }, d), /*#__PURE__*/React.createElement("div", {
    title: d + ' planos',
    style: {
      width: '100%',
      maxWidth: 22,
      height: Math.max(6, d / maior * 100) + 'px',
      borderRadius: 7,
      background: d === 0 ? 'var(--gray-150)' : i === dias.length - 1 ? 'var(--lime-400)' : 'var(--forest-900)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      color: 'var(--text-subtle)'
    }
  }, rot[i]))));
}
function TelaPainel({
  mobile,
  abrirPlano,
  aoNovo,
  ir
}) {
  const casos = window.MN_CASOS;
  const [periodo, setPeriodo] = React.useState('14');
  const pend = [{
    t: '1 plano sem nome',
    a: 'Ver'
  }, {
    t: '2 planos sem paciente vinculado',
    a: 'Ver'
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: mobile ? 16 : 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))',
      gap: mobile ? 12 : 16
    }
  }, /*#__PURE__*/React.createElement(CartaoDestaque, {
    tom: "lime",
    rotulo: "Planos",
    valor: "4",
    apoio: "13 mexidos em 14 dias",
    icone: "folder-open",
    aoClicar: () => ir('casos')
  }), /*#__PURE__*/React.createElement(CartaoDestaque, {
    rotulo: "Pacientes",
    valor: "3",
    apoio: "Fichas com restri\xE7\xF5es e hist\xF3rico",
    icone: "user-round",
    aoClicar: () => ir('pacientes')
  }), /*#__PURE__*/React.createElement(CartaoDestaque, {
    rotulo: "Dias trabalhados",
    valor: "9",
    apoio: "De 14 dias corridos",
    icone: "clipboard-list"
  }), /*#__PURE__*/React.createElement(CartaoDestaque, {
    tom: "ocre",
    rotulo: "Precisa de aten\xE7\xE3o",
    valor: "2",
    apoio: "Coisas que atrapalham na entrega",
    icone: "triangle-alert"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px',
      gap: mobile ? 16 : 24
    }
  }, /*#__PURE__*/React.createElement(PCard, {
    title: "Come\xE7ar agora",
    description: "Escolha o caminho conforme o atendimento. D\xE1 para trocar de r\xE1pido para completo depois.",
    action: mobile ? null : /*#__PURE__*/React.createElement(PButton, {
      icon: "plus",
      onClick: aoNovo
    }, "Novo plano")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 10
    }
  }, mobile ? /*#__PURE__*/React.createElement(PButton, {
    icon: "plus",
    onClick: aoNovo
  }, "Novo plano") : null, /*#__PURE__*/React.createElement(PButton, {
    variant: "outline",
    icon: "user-round",
    onClick: () => ir('pacientes')
  }, "Pacientes"), /*#__PURE__*/React.createElement(PButton, {
    variant: "outline",
    icon: "barcode",
    onClick: () => ir('produtos')
  }, "Cadastrar produto")), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: '1px solid var(--border-subtle)',
      paddingTop: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '600 14px/1.2 var(--font-sans)',
      color: 'var(--forest-900)'
    }
  }, "Planos mexidos por dia"), /*#__PURE__*/React.createElement(PTabs, {
    variant: "pill",
    value: periodo,
    onChange: setPeriodo,
    items: [{
      value: '7',
      label: '7 dias'
    }, {
      value: '14',
      label: '14 dias'
    }]
  })), /*#__PURE__*/React.createElement(GraficoAtividade, {
    dias: periodo === '7' ? window.MN_ATIVIDADE.slice(7) : window.MN_ATIVIDADE
  }))), /*#__PURE__*/React.createElement(PCard, {
    title: "Onde voc\xEA parou",
    description: "Os \xFAltimos planos abertos neste aparelho."
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column'
    }
  }, casos.map((c, i) => /*#__PURE__*/React.createElement("li", {
    key: c.id,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: i < casos.length - 1 ? '1px solid var(--border-subtle)' : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: i === 0 ? 'var(--lime-100)' : 'var(--gray-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--forest-900)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "clipboard-list",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '600 14px/1.25 var(--font-sans)',
      color: c.nome ? 'var(--forest-900)' : 'var(--text-muted)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, c.nome || 'Plano sem nome'), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 12px/1.3 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, c.modo, " \xB7 ", c.quando)), /*#__PURE__*/React.createElement(PButton, {
    size: "sm",
    variant: "ghost",
    onClick: () => abrirPlano(c)
  }, "Abrir")))))), /*#__PURE__*/React.createElement(PCard, {
    title: "Precisa de aten\xE7\xE3o",
    description: "Coisas pequenas que atrapalham depois, na hora de entregar."
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, pend.map(p => /*#__PURE__*/React.createElement("li", {
    key: p.t,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 14px',
      background: 'var(--surface-sunken)',
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      font: 'var(--type-body)',
      color: 'var(--text-body)'
    }
  }, /*#__PURE__*/React.createElement(PIcon, {
    name: "triangle-alert",
    size: 16,
    color: "var(--state-low)"
  }), p.t), /*#__PURE__*/React.createElement(PButton, {
    size: "sm",
    variant: "outline",
    onClick: () => ir('casos')
  }, p.a))))));
}
window.TelaPainel = TelaPainel;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Painel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Plano.jsx
try { (() => {
const {
  Card: QCard,
  Button: QButton,
  Input: QInput,
  CampoNumero: QNum,
  Tabs: QTabs,
  Icon: QIcon,
  Badge: QBadge,
  Progress: QProgress,
  MedidorMacro,
  Alert: QAlert,
  GrupoOpcoes: QGrupo,
  Select: QSelect,
  Separator: QSep
} = window.MetaNutriDesignSystem_38356f;
const A = window.MN_ALIMENTOS;
function EntradaRapida({
  aoAdicionar
}) {
  const [t, setT] = React.useState('');
  const [erro, setErro] = React.useState('');
  const enviar = () => {
    const m = t.trim().toLowerCase().match(/^(\d+[.,]?\d*)\s*g?\s+(.+)$/);
    const key = m ? window.MN_BUSCA[m[2].trim()] : null;
    if (!m || !key) {
      setErro(m ? 'Nenhum alimento da tabela com esse nome.' : 'Digite gramas e alimento, ex.: 150 arroz integral');
      return;
    }
    aoAdicionar(key, Number(m[1].replace(',', '.')));
    setT('');
    setErro('');
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(QInput, {
    variant: "sunken",
    icon: "search",
    placeholder: "150 arroz integral",
    "aria-label": "Adicionar alimento",
    value: t,
    error: erro || undefined,
    onChange: e => {
      setT(e.target.value);
      setErro('');
    },
    onKeyDown: e => {
      if (e.key === 'Enter') enviar();
    }
  })), /*#__PURE__*/React.createElement(QButton, {
    variant: "accent",
    icon: "corner-down-left",
    onClick: enviar,
    "aria-label": "Adicionar"
  }, null)), t === '' ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6
    }
  }, window.MN_FREQUENTES.map(([k, g]) => /*#__PURE__*/React.createElement("button", {
    key: k,
    type: "button",
    onClick: () => aoAdicionar(k, g),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      height: 30,
      padding: '0 12px',
      borderRadius: 999,
      border: '1px solid var(--border-default)',
      background: '#fff',
      cursor: 'pointer',
      font: '500 12px/1 var(--font-sans)',
      color: 'var(--forest-900)'
    }
  }, /*#__PURE__*/React.createElement(QIcon, {
    name: "plus",
    size: 12
  }), A[k].d.split(',')[0], /*#__PURE__*/React.createElement("span", {
    className: "mn-num",
    style: {
      color: 'var(--text-muted)',
      fontWeight: 400
    }
  }, g, " g")))) : null);
}
function LinhaItem({
  it,
  mobile,
  aoMudar,
  aoRemover,
  principal
}) {
  const a = A[it[0]];
  const kcal = a.kcal * it[1] / 100;
  return /*#__PURE__*/React.createElement("li", {
    style: {
      display: 'flex',
      flexDirection: mobile ? 'column' : 'row',
      alignItems: mobile ? 'stretch' : 'center',
      gap: mobile ? 6 : 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '500 14px/1.3 var(--font-sans)',
      color: 'var(--forest-900)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, a.d), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 12px/1.3 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, window.mnMedida(it[0], it[1]))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96
    }
  }, /*#__PURE__*/React.createElement(QNum, {
    rotulo: 'Gramas de ' + a.d,
    rotuloOculto: true,
    size: "sm",
    valor: it[1],
    sufixo: "g",
    aoMudar: v => v != null && v >= 0 && aoMudar(v)
  })), /*#__PURE__*/React.createElement("span", {
    className: "mn-num",
    style: {
      flex: mobile ? 1 : 'none',
      width: mobile ? 'auto' : 76,
      textAlign: mobile ? 'left' : 'right',
      font: '600 13px/1 var(--font-data)',
      color: 'var(--forest-900)'
    }
  }, window.mnFmt(kcal), " kcal"), principal ? /*#__PURE__*/React.createElement(QButton, {
    variant: "ghost",
    size: "sm",
    icon: "arrow-left-right",
    "aria-label": 'Substituir ' + a.d
  }) : null, /*#__PURE__*/React.createElement(QButton, {
    variant: "ghost",
    size: "sm",
    icon: "x",
    "aria-label": 'Remover ' + a.d,
    onClick: aoRemover
  })));
}
function CartaoRefeicao({
  r,
  mobile,
  mudar
}) {
  const [op, setOp] = React.useState('principal');
  const itens = r[op];
  const set = novo => mudar(Object.assign({}, r, {
    [op]: novo
  }));
  return /*#__PURE__*/React.createElement(QCard, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 112,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(QInput, {
    icon: "clock",
    defaultValue: r.horario,
    "aria-label": 'Horário de ' + r.nome,
    numeric: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(QInput, {
    defaultValue: r.nome,
    "aria-label": "Nome da refei\xE7\xE3o",
    style: {
      fontWeight: 600
    }
  })), /*#__PURE__*/React.createElement(QButton, {
    variant: "ghost",
    icon: "trash-2",
    "aria-label": 'Remover refeição ' + r.nome
  })), /*#__PURE__*/React.createElement(QTabs, {
    fill: true,
    value: op,
    onChange: setOp,
    items: [{
      value: 'principal',
      label: 'Principal',
      count: r.principal.length || null
    }, {
      value: 'substituto1',
      label: mobile ? 'Subst. 1' : 'Substituto 1',
      count: r.substituto1.length || null
    }, {
      value: 'substituto2',
      label: mobile ? 'Subst. 2' : 'Substituto 2',
      count: r.substituto2.length || null
    }]
  }), /*#__PURE__*/React.createElement(EntradaRapida, {
    aoAdicionar: (k, g) => set(itens.concat([[k, g]]))
  }), itens.length === 0 ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "Nenhum alimento nesta op\xE7\xE3o.") : /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, itens.map((it, i) => /*#__PURE__*/React.createElement(LinhaItem, {
    key: i + it[0],
    it: it,
    mobile: mobile,
    principal: op === 'principal',
    aoMudar: g => set(itens.map((x, j) => j === i ? [x[0], g] : x)),
    aoRemover: () => set(itens.filter((_, j) => j !== i))
  }))), op !== 'principal' ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-muted)'
    }
  }, "Os substitutos n\xE3o entram na soma do dia nem na adequa\xE7\xE3o.") : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)'
    }
  }, "Total desta op\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    className: "mn-num",
    style: {
      font: '700 15px/1 var(--font-data)',
      color: 'var(--forest-900)'
    }
  }, window.mnFmt(window.mnKcal(itens)), " kcal")));
}
function ResumoDoDia({
  plano
}) {
  const kcal = plano.reduce((s, r) => s + window.mnKcal(r.principal), 0);
  const get = 1850;
  const pct = Math.round(kcal / get * 100);
  const est = pct < 90 ? ['warning', 'Abaixo de 90%'] : pct > 110 ? ['error', 'Acima de 110%'] : ['success', 'Entre 90% e 110%'];
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": "Resumo do dia",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-stat mn-stat--lime",
    style: {
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "mn-stat__top"
  }, /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__label"
  }, "Energia do plano"), /*#__PURE__*/React.createElement(QButton, {
    size: "sm",
    variant: "outline",
    icon: "settings-2"
  }, "Ajustar")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__value"
  }, window.mnFmt(kcal)), /*#__PURE__*/React.createElement("span", {
    className: "mn-stat__unit"
  }, "kcal")), /*#__PURE__*/React.createElement(QProgress, {
    value: pct,
    variant: "forest",
    style: {
      background: 'rgba(255,255,255,.6)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1 var(--font-sans)'
    }
  }, pct, "% do GET \xB7 ", window.mnFmt(get), " kcal"), /*#__PURE__*/React.createElement(QBadge, {
    variant: est[0],
    style: {
      background: '#fff'
    }
  }, est[1]))), /*#__PURE__*/React.createElement(QCard, {
    title: "Gasto energ\xE9tico",
    tight: true
  }, /*#__PURE__*/React.createElement("dl", {
    style: {
      margin: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      font: 'var(--type-body)'
    }
  }, [['TMB', '1.194 kcal'], ['Fator de atividade', '1,55 · moderado'], ['GET calculado', '1.850 kcal']].map(([k, v]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("dt", {
    style: {
      color: 'var(--text-muted)'
    }
  }, k), /*#__PURE__*/React.createElement("dd", {
    className: "mn-num",
    style: {
      margin: 0,
      fontWeight: 600,
      color: 'var(--forest-900)'
    }
  }, v)))), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-subtle)'
    }
  }, "Fonte: Mifflin-St Jeor, 1990")), /*#__PURE__*/React.createElement(QCard, {
    title: "Macronutrientes",
    tight: true,
    action: /*#__PURE__*/React.createElement(QButton, {
      variant: "ghost",
      size: "sm",
      icon: "sliders-horizontal"
    }, "Metas")
  }, /*#__PURE__*/React.createElement(MedidorMacro, {
    nome: "Prote\xEDna",
    valores: "84,2 g \xB7 19,3%",
    faixaInicio: 20,
    faixaFim: 70,
    posicao: 38,
    estado: "dentro",
    frase: "Dentro da faixa",
    meta: "Meta: 10 a 35%"
  }), /*#__PURE__*/React.createElement(QSep, null), /*#__PURE__*/React.createElement(MedidorMacro, {
    nome: "Carboidrato",
    valores: "206 g \xB7 47,2%",
    faixaInicio: 45,
    faixaFim: 65,
    posicao: 50,
    estado: "dentro",
    frase: "Quase no meio da faixa",
    meta: "Meta: 45 a 65%"
  }), /*#__PURE__*/React.createElement(QSep, null), /*#__PURE__*/React.createElement(MedidorMacro, {
    nome: "Gordura",
    valores: "64,1 g \xB7 33,1%",
    faixaInicio: 20,
    faixaFim: 35,
    posicao: 31,
    estado: "dentro",
    frase: "Quase l\xE1 do limite",
    meta: "Meta: 20 a 35%"
  })));
}
function TelaPlano({
  mobile,
  plano,
  setPlano
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px',
      gap: mobile ? 16 : 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      order: mobile ? 2 : 1
    }
  }, plano.map(r => /*#__PURE__*/React.createElement(CartaoRefeicao, {
    key: r.id,
    r: r,
    mobile: mobile,
    mudar: nr => setPlano(plano.map(x => x.id === r.id ? nr : x))
  })), /*#__PURE__*/React.createElement(QButton, {
    variant: "outline",
    icon: "plus",
    block: true
  }, "Adicionar refei\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      order: mobile ? 1 : 2,
      position: mobile ? 'static' : 'sticky',
      top: 96
    }
  }, /*#__PURE__*/React.createElement(ResumoDoDia, {
    plano: plano
  })));
}
function TelaCaso({
  mobile
}) {
  const [sexo, setSexo] = React.useState('F');
  const [form, setForm] = React.useState('mifflin');
  const g2 = {
    display: 'grid',
    gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'repeat(2,minmax(0,1fr))',
    gap: 14
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? 'minmax(0,1fr)' : 'minmax(0,1fr) 360px',
      gap: mobile ? 16 : 24,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(QCard, {
    title: "Identifica\xE7\xE3o",
    description: "O plano nasce j\xE1 sabendo o que a ficha do paciente sabe."
  }, /*#__PURE__*/React.createElement("div", {
    style: g2
  }, /*#__PURE__*/React.createElement(QInput, {
    label: "Nome",
    defaultValue: "Ana Souza"
  }), /*#__PURE__*/React.createElement(QNum, {
    rotulo: "Idade",
    valor: 24,
    sufixo: "anos"
  }), /*#__PURE__*/React.createElement(QGrupo, {
    rotulo: "Sexo",
    valor: sexo,
    aoEscolher: setSexo,
    opcoes: [{
      valor: 'F',
      rotulo: 'Feminino'
    }, {
      valor: 'M',
      rotulo: 'Masculino'
    }]
  }), /*#__PURE__*/React.createElement(QSelect, {
    label: "Condi\xE7\xE3o",
    options: ['Nenhuma', 'Gestante', 'Lactante']
  }))), /*#__PURE__*/React.createElement(QCard, {
    title: "Antropometria"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: mobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(QNum, {
    rotulo: "Peso",
    valor: 62.5,
    sufixo: "kg"
  }), /*#__PURE__*/React.createElement(QNum, {
    rotulo: "Altura",
    valor: 165,
    sufixo: "cm"
  }), /*#__PURE__*/React.createElement(QNum, {
    rotulo: "Cintura",
    valor: 72,
    sufixo: "cm"
  }), /*#__PURE__*/React.createElement(QNum, {
    rotulo: "Panturrilha",
    valor: null,
    sufixo: "cm",
    dica: "Opcional"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '12px 14px',
      background: 'var(--surface-sunken)',
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: 'var(--type-body)'
    }
  }, "IMC ", /*#__PURE__*/React.createElement("b", {
    className: "mn-num",
    style: {
      color: 'var(--forest-900)'
    }
  }, "22,96 kg/m\xB2")), /*#__PURE__*/React.createElement(QBadge, {
    variant: "success"
  }, "Eutrofia")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-subtle)'
    }
  }, "Classifica\xE7\xE3o: Minist\xE9rio da Sa\xFAde. SISVAN, 2011"))), /*#__PURE__*/React.createElement(QCard, {
    title: "Gasto energ\xE9tico",
    description: "A f\xF3rmula fica \xE0 mostra para conferir."
  }, /*#__PURE__*/React.createElement(QGrupo, {
    rotulo: "F\xF3rmula",
    block: true,
    valor: form,
    aoEscolher: setForm,
    opcoes: [{
      valor: 'mifflin',
      rotulo: 'Mifflin-St Jeor'
    }, {
      valor: 'harris',
      rotulo: 'Harris-Benedict'
    }]
  }), /*#__PURE__*/React.createElement(QSelect, {
    label: "Fator de atividade",
    options: ['1,2 · sedentário', '1,375 · leve', '1,55 · moderado', '1,725 · intenso'],
    defaultValue: "1,55 \xB7 moderado"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--forest-900)',
      color: '#fff',
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px/1 var(--font-sans)',
      opacity: .75
    }
  }, "GET calculado"), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '600 32px/1 var(--font-display)',
      letterSpacing: '-.02em'
    }
  }, form === 'mifflin' ? '1.850' : '2.117', /*#__PURE__*/React.createElement("span", {
    style: {
      font: '500 13px var(--font-sans)',
      verticalAlign: 'super',
      marginLeft: 6,
      color: 'var(--lime-400)'
    }
  }, "kcal")), /*#__PURE__*/React.createElement("span", {
    className: "mn-num",
    style: {
      font: '400 12px/1.4 var(--font-data)',
      opacity: .75
    }
  }, "TMB ", form === 'mifflin' ? '1.194' : '1.366', " \xD7 1,55")), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-caption)',
      color: 'var(--text-subtle)'
    }
  }, "Fonte: ", form === 'mifflin' ? 'Mifflin-St Jeor, 1990' : 'Harris-Benedict, 1918')));
}
Object.assign(window, {
  TelaPlano,
  TelaCaso
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Plano.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Shell.jsx
try { (() => {
const MN = window.MetaNutriDesignSystem_38356f;
const {
  Button,
  Input,
  Icon,
  ItemMenu,
  Sheet,
  DropdownMenu,
  Tooltip
} = MN;
function Marca({
  inverse
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo/icone.svg",
    width: "30",
    height: "30",
    alt: ""
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      font: '700 20px/1 var(--font-display)',
      letterSpacing: '-0.02em',
      color: inverse ? '#fff' : 'var(--forest-900)'
    }
  }, "MetaNutri"));
}
function Secao({
  titulo,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      font: '500 11px/1 var(--font-sans)',
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: 'var(--text-subtle)',
      padding: '0 12px 8px'
    }
  }, titulo), children);
}
function MenuLateral({
  rota,
  ir,
  casoAtual,
  aoNovo
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Menu principal",
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--gray-100)',
      borderRight: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 16px'
    }
  }, /*#__PURE__*/React.createElement(Marca, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => ir('conta'),
    style: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: 10,
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 14,
      cursor: 'pointer',
      textAlign: 'left',
      boxShadow: 'var(--shadow-xs)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: '50%',
      background: 'var(--lime-400)',
      color: 'var(--forest-900)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 13px/1 var(--font-sans)'
    }
  }, "BL"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '600 14px/1.2 var(--font-sans)',
      color: 'var(--forest-900)'
    }
  }, "Beatriz Lima"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      font: '400 12px/1.3 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, "Estudante \xB7 gr\xE1tis")), /*#__PURE__*/React.createElement(Icon, {
    name: "chevrons-up-down",
    size: 14,
    color: "var(--text-subtle)"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '18px 12px',
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement(Button, {
    icon: "plus",
    block: true,
    onClick: aoNovo
  }, "Novo plano"), /*#__PURE__*/React.createElement(Secao, {
    titulo: "Trabalho"
  }, /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "layout-dashboard",
    rotulo: "Painel",
    ativo: rota === 'painel',
    aoClicar: () => ir('painel')
  }), /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "user-round",
    rotulo: "Pacientes",
    ativo: rota === 'pacientes',
    aoClicar: () => ir('pacientes')
  }), /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "folder-open",
    rotulo: "Planos",
    extra: 4,
    ativo: rota === 'casos',
    aoClicar: () => ir('casos')
  }), casoAtual ? /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "clipboard-list",
    rotulo: rota === 'planejador' ? 'Plano aberto' : 'Continuar plano',
    detalhe: casoAtual,
    ativo: rota === 'planejador',
    aoClicar: () => ir('planejador')
  }) : null), /*#__PURE__*/React.createElement(Secao, {
    titulo: "Alimentos"
  }, /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "book-open",
    rotulo: "Tabela de alimentos",
    ativo: rota === 'alimentos',
    aoClicar: () => ir('alimentos')
  }), /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "barcode",
    rotulo: "Meus produtos",
    ativo: rota === 'produtos',
    aoClicar: () => ir('produtos')
  })), /*#__PURE__*/React.createElement(Secao, {
    titulo: "Sistema"
  }, /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "user-circle",
    rotulo: "Conta e plano",
    ativo: rota === 'conta',
    aoClicar: () => ir('conta')
  }), /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "settings",
    rotulo: "Configura\xE7\xF5es",
    ativo: rota === 'config',
    aoClicar: () => ir('config')
  }), /*#__PURE__*/React.createElement(ItemMenu, {
    icone: "circle-help",
    rotulo: "Ajuda",
    ativo: rota === 'ajuda',
    aoClicar: () => ir('ajuda')
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--gray-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--forest-900)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "hard-drive",
    size: 18
  })), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '600 14px/1.2 var(--font-sans)',
      color: 'var(--forest-900)'
    }
  }, "Planos salvos s\xF3 neste aparelho"), /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 12px/1.4 var(--font-sans)',
      color: 'var(--text-muted)'
    }
  }, "Fa\xE7a backup antes de trocar de aparelho."), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    block: true,
    icon: "download",
    onClick: () => ir('config')
  }, "Fazer backup"))));
}
function Cabecalho({
  titulo,
  subtitulo,
  trilha,
  acoes,
  mobile,
  aoAbrirMenu
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      background: 'rgba(241,241,241,.86)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1400,
      margin: '0 auto',
      minHeight: mobile ? 60 : 72,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: mobile ? '8px 12px' : '10px 24px'
    }
  }, mobile ? /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "menu",
    "aria-label": "Abrir menu",
    onClick: aoAbrirMenu
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, trilha ? /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Voc\xEA est\xE1 em",
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      font: '500 12px/1.2 var(--font-sans)',
      color: 'var(--text-muted)',
      marginBottom: 2
    }
  }, trilha.map(p => /*#__PURE__*/React.createElement("span", {
    key: p.rotulo,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: p.aoClicar,
    style: {
      border: 0,
      background: 'none',
      padding: 0,
      color: 'inherit',
      cursor: 'pointer',
      font: 'inherit'
    }
  }, p.rotulo), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-right",
    size: 12
  })))) : null, /*#__PURE__*/React.createElement("h1", {
    style: {
      font: (mobile ? '600 18px' : '600 20px') + '/1.2 var(--font-display)',
      color: 'var(--forest-900)',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, titulo), subtitulo && !mobile ? /*#__PURE__*/React.createElement("p", {
    style: {
      font: '400 13px/1.3 var(--font-sans)',
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, subtitulo) : null), !mobile ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 260
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    variant: "sunken",
    icon: "search",
    placeholder: "Buscar paciente ou alimento",
    "aria-label": "Buscar",
    style: {
      gap: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      right: 10,
      top: 10,
      display: 'flex',
      gap: 3
    }
  }, ['⌘', 'K'].map(k => /*#__PURE__*/React.createElement("kbd", {
    key: k,
    style: {
      font: '500 11px/1 var(--font-sans)',
      color: 'var(--text-muted)',
      background: '#fff',
      border: '1px solid var(--border-default)',
      borderRadius: 5,
      padding: '3px 5px'
    }
  }, k))))) : null, acoes ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexShrink: 0
    }
  }, acoes) : null, !mobile ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(Tooltip, {
    content: "Ajuda e fontes",
    side: "bottom"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "circle-help",
    "aria-label": "Ajuda"
  })), /*#__PURE__*/React.createElement(Tooltip, {
    content: "Configura\xE7\xF5es",
    side: "bottom"
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    icon: "settings",
    "aria-label": "Configura\xE7\xF5es"
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--forest-900)',
      color: 'var(--lime-400)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: '600 13px/1 var(--font-sans)',
      marginLeft: 4
    }
  }, "BL")) : null));
}
function MenuExportar({
  mobile
}) {
  return /*#__PURE__*/React.createElement(DropdownMenu, {
    trigger: mobile ? /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      icon: "download",
      "aria-label": "Exportar"
    }) : /*#__PURE__*/React.createElement(Button, {
      variant: "outline",
      icon: "download",
      iconRight: "chevron-down"
    }, "Exportar"),
    items: [{
      heading: 'Para o paciente'
    }, {
      icon: 'printer',
      label: 'Dieta para imprimir',
      hint: 'PDF'
    }, {
      heading: 'Para o estágio'
    }, {
      icon: 'file-text',
      label: 'Aconselhamento',
      hint: '.docx'
    }, {
      icon: 'calculator',
      label: 'Memorial de cálculo',
      hint: '.docx'
    }, {
      separator: true
    }, {
      icon: 'copy',
      label: 'Copiar tabela de adequação'
    }]
  });
}
function TelaVazia({
  titulo
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mn-card",
    style: {
      alignItems: 'center',
      textAlign: 'center',
      padding: 48
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "layout-template",
    size: 24,
    color: "var(--text-subtle)"
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-card-title)',
      color: 'var(--forest-900)'
    }
  }, titulo), /*#__PURE__*/React.createElement("p", {
    style: {
      font: 'var(--type-body)',
      color: 'var(--text-muted)',
      maxWidth: 380
    }
  }, "Esta tela existe no produto mas n\xE3o foi recriada neste kit. Veja o Painel e o Plano aberto."));
}
Object.assign(window, {
  MenuLateral,
  Cabecalho,
  MenuExportar,
  TelaVazia,
  Marca
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/data.js
try { (() => {
// Demo data for the MetaNutri UI kit. Values per 100 g follow TACO 4ª ed. (rounded); plan is fictional.
window.MN_ALIMENTOS = {
  arroz: {
    d: 'Arroz, integral, cozido',
    kcal: 124,
    m: ['colher de servir', 45]
  },
  feijao: {
    d: 'Feijão, carioca, cozido',
    kcal: 76,
    m: ['concha média', 86]
  },
  frango: {
    d: 'Frango, peito, sem pele, grelhado',
    kcal: 159,
    m: ['filé médio', 100]
  },
  alface: {
    d: 'Alface, crespa, crua',
    kcal: 11,
    m: ['folha média', 10]
  },
  tomate: {
    d: 'Tomate, com semente, cru',
    kcal: 15,
    m: ['fatia média', 15]
  },
  azeite: {
    d: 'Azeite, de oliva, extra virgem',
    kcal: 884,
    m: ['colher de sopa', 8]
  },
  pao: {
    d: 'Pão, trigo, francês',
    kcal: 300,
    m: ['unidade', 50]
  },
  ovo: {
    d: 'Ovo, de galinha, inteiro, cozido',
    kcal: 146,
    m: ['unidade', 45]
  },
  leite: {
    d: 'Leite, de vaca, integral',
    kcal: 61,
    m: ['copo americano', 165]
  },
  mamao: {
    d: 'Mamão, Papaia, cru',
    kcal: 40,
    m: ['fatia média', 100]
  },
  iogurte: {
    d: 'Iogurte, natural',
    kcal: 51,
    m: ['pote', 170]
  },
  aveia: {
    d: 'Aveia, flocos, crua',
    kcal: 394,
    m: ['colher de sopa', 15]
  },
  banana: {
    d: 'Banana, prata, crua',
    kcal: 98,
    m: ['unidade média', 55]
  },
  queijo: {
    d: 'Queijo, minas, frescal',
    kcal: 264,
    m: ['fatia média', 30]
  },
  leiteDesn: {
    d: 'Leite, de vaca, desnatado, UHT',
    kcal: 35,
    m: ['copo americano', 165]
  },
  sardinha: {
    d: 'Sardinha, conserva em óleo',
    kcal: 285,
    m: ['unidade', 25]
  },
  couve: {
    d: 'Couve, manteiga, refogada',
    kcal: 90,
    m: ['colher de sopa', 20]
  },
  cenoura: {
    d: 'Cenoura, crua',
    kcal: 34,
    m: ['colher de sopa ralada', 12]
  },
  batata: {
    d: 'Batata, doce, cozida',
    kcal: 77,
    m: ['fatia média', 40]
  }
};
window.MN_BUSCA = {
  arroz: 'arroz',
  'arroz integral': 'arroz',
  feijao: 'feijao',
  'feijão': 'feijao',
  frango: 'frango',
  alface: 'alface',
  tomate: 'tomate',
  azeite: 'azeite',
  pao: 'pao',
  'pão': 'pao',
  ovo: 'ovo',
  leite: 'leite',
  mamao: 'mamao',
  'mamão': 'mamao',
  iogurte: 'iogurte',
  aveia: 'aveia',
  banana: 'banana',
  queijo: 'queijo',
  sardinha: 'sardinha',
  couve: 'couve',
  cenoura: 'cenoura',
  batata: 'batata',
  'batata doce': 'batata'
};
window.MN_FREQUENTES = [['arroz', 150], ['feijao', 86], ['frango', 100], ['banana', 55], ['ovo', 45], ['aveia', 15]];
window.MN_PLANO_INICIAL = [{
  id: 'r1',
  horario: '07:00',
  nome: 'Café da manhã',
  principal: [['pao', 50], ['ovo', 45], ['leite', 165], ['mamao', 100]],
  substituto1: [['iogurte', 170], ['aveia', 30]],
  substituto2: []
}, {
  id: 'r2',
  horario: '12:30',
  nome: 'Almoço',
  principal: [['arroz', 150], ['feijao', 86], ['frango', 100], ['alface', 30], ['tomate', 45], ['azeite', 8]],
  substituto1: [['batata', 160]],
  substituto2: []
}, {
  id: 'r3',
  horario: '16:00',
  nome: 'Lanche da tarde',
  principal: [['iogurte', 170], ['aveia', 15], ['banana', 55]],
  substituto1: [],
  substituto2: []
}, {
  id: 'r4',
  horario: '19:30',
  nome: 'Jantar',
  principal: [['arroz', 100], ['feijao', 86], ['frango', 100], ['couve', 40]],
  substituto1: [],
  substituto2: []
}];
window.MN_CASOS = [{
  id: 'c1',
  nome: 'Ana Souza — retorno',
  modo: 'Atendimento completo',
  quando: 'hoje às 14:20'
}, {
  id: 'c2',
  nome: 'Carlos M., 8 anos',
  modo: 'Atendimento completo',
  quando: 'ontem às 21:05'
}, {
  id: 'c3',
  nome: 'Júlia (gestante, 2º tri)',
  modo: 'Prescrição rápida',
  quando: 'há 3 dias'
}, {
  id: 'c4',
  nome: '',
  modo: 'Prescrição rápida',
  quando: '12 de setembro'
}];
window.MN_ATIVIDADE = [1, 0, 2, 3, 0, 1, 0, 0, 2, 4, 1, 0, 3, 2];
window.MN_ADEQUACAO = [{
  k: 'calcio',
  n: 'Cálcio',
  v: '612 mg',
  ref: '1.000 mg',
  tipo: 'RDA',
  pct: 61,
  estado: 'abaixo',
  semDado: 2
}, {
  k: 'ferro',
  n: 'Ferro',
  v: '19,4 mg',
  ref: '18 mg',
  tipo: 'RDA',
  pct: 108,
  estado: 'adequado'
}, {
  k: 'magnesio',
  n: 'Magnésio',
  v: '298 mg',
  ref: '310 mg',
  tipo: 'RDA',
  pct: 96,
  estado: 'adequado',
  limite: true
}, {
  k: 'zinco',
  n: 'Zinco',
  v: '9,1 mg',
  ref: '8 mg',
  tipo: 'RDA',
  pct: 114,
  estado: 'adequado'
}, {
  k: 'vitc',
  n: 'Vitamina C',
  v: '142 mg',
  ref: '75 mg',
  tipo: 'RDA',
  pct: 189,
  estado: 'adequado'
}, {
  k: 'vita',
  n: 'Vitamina A',
  v: '410 µg',
  ref: '700 µg',
  tipo: 'RDA',
  pct: 59,
  estado: 'abaixo',
  semDado: 5
}, {
  k: 'potassio',
  n: 'Potássio',
  v: '2.140 mg',
  ref: '2.600 mg',
  tipo: 'AI',
  pct: 82,
  estado: 'abaixo'
}, {
  k: 'fibra',
  n: 'Fibra alimentar',
  v: '22,0 g',
  ref: '25 g',
  tipo: 'AI',
  pct: 88,
  estado: 'abaixo',
  semDado: 1
}, {
  k: 'sodio',
  n: 'Sódio',
  v: '2.740 mg',
  ref: '2.300 mg',
  tipo: 'CDRR',
  pct: 119,
  estado: 'acima-limite'
}];
window.MN_COBRIR = {
  calcio: {
    falta: '388 mg',
    kcal: 108,
    s: [['leiteDesn', 200, 69], ['iogurte', 170, 63], ['sardinha', 50, 71], ['queijo', 30, 45], ['couve', 40, 18]]
  },
  vita: {
    falta: '290 µg',
    kcal: 108,
    s: [['cenoura', 36, 88], ['couve', 40, 34], ['batata', 80, 21]]
  },
  potassio: {
    falta: '460 mg',
    kcal: 108,
    s: [['banana', 110, 85], ['feijao', 86, 47], ['batata', 80, 43]]
  },
  fibra: {
    falta: '3,0 g',
    kcal: 108,
    s: [['aveia', 30, 100], ['feijao', 86, 78], ['couve', 40, 23]]
  }
};
window.mnFmt = function (n, casas) {
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: casas || 0,
    maximumFractionDigits: casas || 0
  });
};
window.mnMedida = function (key, g) {
  const a = window.MN_ALIMENTOS[key];
  if (!a) return '';
  const q = g / a.m[1];
  const r = Math.round(q * 2) / 2;
  return (r === 0 ? '< 1/2' : window.mnFmt(r, r % 1 ? 1 : 0)) + ' ' + a.m[0] + ' (' + window.mnFmt(g) + ' g)';
};
window.mnKcal = function (itens) {
  return itens.reduce(function (s, it) {
    const a = window.MN_ALIMENTOS[it[0]];
    return s + (a ? a.kcal * it[1] / 100 : 0);
  }, 0);
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Progress = __ds_scope.Progress;

__ds_ns.Separator = __ds_scope.Separator;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.CampoNumero = __ds_scope.CampoNumero;

__ds_ns.GrupoOpcoes = __ds_scope.GrupoOpcoes;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Label = __ds_scope.Label;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.EtapasDoCaso = __ds_scope.EtapasDoCaso;

__ds_ns.ItemMenu = __ds_scope.ItemMenu;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.BarraAdequacao = __ds_scope.BarraAdequacao;

__ds_ns.CartaoDestaque = __ds_scope.CartaoDestaque;

__ds_ns.MedidorMacro = __ds_scope.MedidorMacro;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.DropdownMenu = __ds_scope.DropdownMenu;

__ds_ns.Sheet = __ds_scope.Sheet;

})();
