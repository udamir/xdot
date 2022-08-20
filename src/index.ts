export interface TemplateOptions {
  argName: string | string[]
  encoders: Record<string, Encoder | string>
  selfContained: boolean
  strip: boolean
  internalPrefix: string
  encodersPrefix: string
  delimiters: Delimiters
}

type TemplateFunction = (data: any) => string

type Definitions = Record<string, string | Function | any>

type Encoder = (data: any) => string

type Delimiters = {
  start: string
  end: string
}

const defaultOptions = {
  argName: "it",
  encoders: {},
  selfContained: false,
  strip: true,
  internalPrefix: "_val",
  encodersPrefix: "_enc",
  delimiters: {
    start: "{{",
    end: "}}",
  },
}

const defaultSyntax = {
  evaluate: /\{\{([\s\S]+?(\}?)+)\}\}/g, // {{ Math.random() }}
  interpolate: /\{\{=([\s\S]+?)\}\}/g, // {{ it.foo }}
  typeInterpolate: /\{\{%([nsb])=([\s\S]+?)\}\}/g, // {{ %n =it.value }}
  encode: /\{\{([a-z_$]+[\w$]*)?!([\s\S]+?)\}\}/g, // {{ html! it.text }}
  use: /\{\{#([\s\S]+?)\}\}/g, // {{ #def.block }}
  useParams: /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$]+(?:\.[\w$]+|\[[^\]]+\])*|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\}|\[[^\]]*\])/g,
  define: /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}(\n)?/g,
  defineParams: /^\s*([\w$]+):([\s\S]+)/,
  conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}(\n)?/g,
  iterate: /\{\{(~+)\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})(\n)?/g,
}

const escapeCharacters = /([{}[\]()<>\\\/^$\-.+*?!=|&:])/g
const regexpPattern = /^\/(.*)\/([\w]*)$/

type Syntax = typeof defaultSyntax
type TypePrefix = "n" | "s" | "b"

const TYPES: Record<TypePrefix, string> = {
  n: "number",
  s: "string",
  b: "boolean",
}

function resolveDefs(options: TemplateOptions, syntax: Syntax, block: string | number, def: Definitions): string {
  return (typeof block === "string" ? block : block.toString())
    .replace(syntax.define, (_, code: string, assign: string, value: string) => {
      if (code.indexOf("def.") === 0) {
        code = code.substring(4)
      }
      if (!(code in def)) {
        if (assign === ":") {
          value.replace(syntax.defineParams, (_, param: string, v: string) => {
            def[code] = {arg: param, text: v}
            return ""
          })
          if (!(code in def)) def[code] = value
        } else {
          new Function("def", `def['${code}']=${value}`)(def)
        }
      }
      return ""
    })
    .replace(syntax.use, (_, code: string) => {
      code = code.replace(syntax.useParams, (_, s, d, param) => {
        const rw = unescape((d + ":" + param).replace(/'|\\/g, "_"))
        def.__exp = def.__exp || {}
        const defText = typeof def[d] === "string" ? def[d] : def[d].text
        const defArg = typeof def[d] === "string" ? options.argName : def[d].arg
        def.__exp[rw] = defText.replace(new RegExp(`(^|[^\\w$])${defArg}([^\\w$])`, "g"),`$1${param}$2`)
        return s + `def.__exp['${rw}']`
      })
      const v = new Function("def", "return " + code)(def)
      return v ? resolveDefs(options, syntax, v, def) : v
    })
}

function unescape(code: string) {
  return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ")
}

export function template(
  tmpl: string,
  opt?: Partial<TemplateOptions>,
  def?: Definitions
): TemplateFunction {
  const options: TemplateOptions = {...defaultOptions, ...opt}
  const syntax = getSyntax(options.delimiters)
  let sid = 0
  let str = resolveDefs(options, syntax, tmpl, def || {})
  const needEncoders: Record<string, boolean> = {}

  str = (
    "let out='" +
    (options.strip
      ? str
          .trim()
          .replace(/[\t ]+(\r|\n)/g, "\n") // remove trailing spaces
          .replace(/(\r|\n)[\t ]+/g, " ") // leading spaces reduced to " "
          .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") // remove breaks, tabs and JS comments
      : str
    )
      .replace(/'|\\/g, "\\$&")
      .replace(syntax.interpolate, (_, code) => `'+(${unescape(code)})+'`)
      .replace(syntax.typeInterpolate, (_, typ: TypePrefix, code) => {
        const val = options.internalPrefix + sid++
        const error = `throw new Error("expected ${TYPES[typ]}, got "+ (typeof ${val}))`
        return `';const ${val}=(${unescape(code)});if(typeof ${val}!=="${
          TYPES[typ]
        }") ${error};out+=${val}+'`
      })
      .replace(syntax.encode, (_, enc = "", code) => {
        needEncoders[enc] = true
        code = unescape(code)
        const e = options.selfContained ? enc : enc ? "." + enc : '[""]'
        return `'+${options.encodersPrefix}${e}(${code})+'`
      })
      .replace(syntax.conditional, (_, elseCase, code) => {
        if (code) {
          code = unescape(code)
          return elseCase ? `';}else if(${code}){out+='` : `';if(${code}){out+='`
        }
        return elseCase ? "';}else{out+='" : "';}out+='"
      })
      .replace(syntax.iterate, (_, loop, arr, vName, iName) => {
        if (!arr) return "';} } out+='"
        const defI = iName ? `let ${iName}=-1;` : ""
        const incI = iName ? `${iName}++;` : ""
        const val = options.internalPrefix + sid++
        switch (loop) {
          case "~":
            return `';const ${val}=${unescape(arr)};if(${val}){${defI}for (const ${vName} of ${val}){${incI}out+='`
          case "~~":
            const iter = iName ? `[${iName}, ${vName}] of Object.entries` : `${vName} of Object.values`
            return `';const ${val}=${unescape(arr)};if(${val}){for (const ${iter}(${val})){out+='`
          default:
            throw new Error(`unsupported syntax: ${loop} ${arr}:${vName}`)
        }
      })
      .replace(syntax.evaluate, (_, code) => `';${unescape(code)}out+='`) +
    "';return out;"
  )
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(/(\s|;|\}|^|\{)out\+='';/g, "$1")
    .replace(/\+''/g, "")

  const args = Array.isArray(options.argName) ? properties(options.argName) : options.argName

  if (Object.keys(needEncoders).length === 0) {
    return try_(() => new Function(args, str))
  }
  checkEncoders(options, needEncoders)
  str = `return function(${args}){${str}};`
  return try_(() =>
    options.selfContained
      ? new Function((str = addEncoders(options, needEncoders) + str))()
      : new Function(options.encodersPrefix, str)(options.encoders)
  )

  function try_(f: () => any) {
    try {
      return f()
    } catch (e) {
      throw e
    }
  }
}

export function compile(tmpl: string, def?: Definitions): TemplateFunction {
  return template(tmpl, undefined, def)
}

function getSyntax({start, end}: Delimiters): Syntax {
  if (defaultOptions.delimiters.start === start && defaultOptions.delimiters.end === end) {
    return defaultSyntax
  }
  start = escape(start)
  end = escape(end)
  const syntax = {} as Syntax
  for (const syn in defaultSyntax) {
    const s = defaultSyntax[syn as keyof Syntax]
      .toString()
      .replace(/\\\{\\\{/g, start)
      .replace(/\\\}\\\}/g, end)
    syntax[syn as keyof Syntax] = strToRegExp(s)
  }
  return syntax
}

function escape(str: string) {
  return str.replace(escapeCharacters, "\\$1")
}

function strToRegExp(str: string) {
  const [, rx, flags] = str.match(regexpPattern)!
  return new RegExp(rx, flags)
}

function properties(args: string[]) {
  return args.reduce((s, a, i) => s + (i ? "," : "") + a, "{") + "}"
}

function checkEncoders(options: TemplateOptions, encoders: Record<string, boolean>) {
  const encoderType = options.selfContained ? "string" : "function"
  for (const enc in encoders) {
    const e = options.encoders[enc]
    if (!e) throw new Error(`unknown encoder "${enc}"`)
    if (typeof e !== encoderType)
      throw new Error(`selfContained ${options.selfContained}: encoder type must be "${encoderType}"`)
  }
}

function addEncoders(options: TemplateOptions, encoders: Record<string, boolean>) {
  let s = ""
  for (const enc in encoders) s += `const ${options.encodersPrefix}${enc}=${options.encoders[enc]};`
  return s
}

const encodeHTMLRules: Record<string, string> = {
  "&": "&#38;",
  "<": "&#60;",
  ">": "&#62;",
  '"': "&#34;",
  "'": "&#39;",
  "/": "&#47;",
}

const matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g

export function encodeHtml(s: any) {
  return typeof s === "string" ? s.replace(matchHTML, (m) => encodeHTMLRules[m] || m) : s
}
