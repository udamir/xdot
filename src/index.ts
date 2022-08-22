export type Encoder = (data: any) => string

export interface TemplateOptions {
  args: string | string[]
  encoders: Record<string, Encoder | string>
  strip: boolean
  varName: string
  delimiters: [string, string]
  def: Definitions
}

export type RenderFunction = (...args: any[]) => string
type RuleContext = TemplateOptions & { id: number, args: string[], dependency: Set<string> }
type SyntaxRule = (template: string, ctx: RuleContext) => string
type Definitions = Record<string, string | Function | any>
type TypePrefix = "n" | "s" | "b"

const TYPES: Record<TypePrefix, string> = {
  n: "number",
  s: "string",
  b: "boolean",
}

const escape = (str: string) => str.replace(/([{}[\]()<>\\\/^$\-.+*?!=|&:])/g, "\\$1")
const unescape = (code: string) => code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ")

const inlineTemplate: SyntaxRule = (template, { delimiters: [start, end], def }): string =>
  template.replace(
    new RegExp(`${start}##\\s*([\\w\\.$]+)\\s*(\\:|=)([\\s\\S]+?)#${end}(\\r\\n|\\r|\\n)?`, "g"),
    (_, code: string, assign: string, value: string, eol: string) => {
      if (code.indexOf("def.") === 0) {
        code = code.substring(4)
      }
      if (!(code in def)) {
        if (assign === ":") {
          value.replace(/^\s*([\w$]+):([\s\S]+)/, (_, param: string, v: string) => {
            def[code] = { arg: param, text: v }
            return ""
          })
          if (!(code in def)) def[code] = value
        } else {
          new Function("def", `def['${code}']=${value}`)(def)
        }
      }
      return ""
    }
  )
  
const resolveDefs: SyntaxRule = (template, ctx): string =>
  template.replace(
    /\{\{#([\s\S]+?)\}\}(\r\n|\r|\n)?/g, 
    (_, code: string) => {
      const { args, delimiters: [start, end], def } = ctx
      code = code.replace(
        /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$]+(?:\.[\w$]+|\[[^\]]+\])*|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\}|\[[^\]]*\])/g, 
        (_, s, d, param) => {
          const rw = unescape((d + ":" + param).replace(/'|\\/g, "_"))
          def.__exp = def.__exp || {}
          const defText = typeof def[d] === "string" ? def[d] : def[d].text
          const defArg = typeof def[d] === "string" ? args : def[d].arg
          def.__exp[rw] = defText.replace(new RegExp(`(^|[^\\w$])${defArg}([^\\w$])`, "g"),`$1${param}$2`)
          return s + `def.__exp['${rw}']`
        }
      )
      const v = new Function("def", "return " + code)(def)
      return v ? resolveDefs(v, ctx) : v
    }
  )

const format: SyntaxRule = (template, { strip }) =>
  (!strip ? template : template  
    .trim()
    .replace(/[\t ]+(\r|\n)/g, "\n") // remove trailing spaces
    .replace(/(\r|\n)[\t ]+/g, " ") // leading spaces reduced to " "
    .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") // remove breaks, tabs and JS comments
  ).replace(/'|\\/g, "\\$&")

const interpolate: SyntaxRule = (template, { delimiters: [start, end] }) =>
  template.replace(
    new RegExp(`${start}=([\\s\\S]+?)${end}`, "g"),
    (_, code) => `'+(${unescape(code)})+'`
  )

const typeInterpolate: SyntaxRule = (template, ctx) => {
  const { delimiters: [start, end], varName: tmp } = ctx
  return template.replace(
    new RegExp(`${start}%([nsb])=([\\s\\S]+?)${end}`, "g"),
    (_, typ: TypePrefix, code) => {
      const val = `${tmp}[${ctx.id++}]`
      const error = `throw new Error("expected ${TYPES[typ]}, got "+ (typeof ${val}))`
      return `';${val}=(${unescape(code)});if(typeof ${val}!=="${TYPES[typ]}") ${error};${tmp}[0]+=${val}+'`
    }
  )
}

const encode: SyntaxRule = (template,  { delimiters: [start, end], dependency, varName: tmp }) => 
  template.replace(
    new RegExp(`${start}([a-z_$]+[\\w$]*)?!([\\s\\S]+?)${end}`,"g"), 
    (_, enc = "", code) => {
      dependency.add(enc || "")
      return `'+${tmp}.${enc || "html"}(${unescape(code)})+'`
    }
  )

const conditional: SyntaxRule = (template, { varName: tmp, delimiters: [start, end] }) =>
  template.replace(
    new RegExp(`${start}\\?(\\?)?\\s*([\\s\\S]*?)\\s*${end}(\\r\\n|\\r|\\n)?`, "g"),
    (_, elseCase, code, eol) => {
      return code
        ? `';${elseCase ? "}else " : ""}if(${unescape(code)}){${tmp}[0]+='`
        : elseCase ? `';}else{${tmp}[0]+='` : `';}${tmp}[0]+='`
    }
  )

const iterate: SyntaxRule = (template, ctx) => {
  const { varName: tmp, delimiters: [start, end] } = ctx
  return template.replace(
    new RegExp(`${start}(~+)\\s*(?:${end}|([\\s\\S]+?)\\s*\\:\\s*([\\w$]+)\\s*(?:\\:\\s*([\\w$]+))?\\s*${end})(\\r\\n|\\r|\\n)?`,"g"), 
    (_, loop, arr, vName, iName, eol) => {
      if (!arr) return `';}}${tmp}[0]+='`
      const [defI, incI] = iName ? [`let ${iName}=-1;`,`${iName}++;`] : ["", ""]
      const val = `${tmp}[${ctx.id++}]`
      switch (loop) {
        case "~":
          return `';${val}=${unescape(arr)};if(${val}){${defI}for (const ${vName} of ${val}){${incI}${tmp}[0]+='`
        case "~~":
          const iter = iName ? `[${iName}, ${vName}] of Object.entries` : `${vName} of Object.values`
          return `';${val}=${unescape(arr)};if(${val}){for (const ${iter}(${val})){${tmp}[0]+='`
        default:
          throw new Error(`unsupported syntax: ${loop} ${arr}:${vName}`)
      }
    }
  )
}

const variables: SyntaxRule = (template, { delimiters: [start, end], args }) => 
  template.replace(
    new RegExp(`${start}(?:\\:\\s*([\\w]+))\s*${"(?:\\:\\s*([\\w]+))?".repeat(4)}${end}(\\r\\n|\\r|\\n)?`, "g"),
    (_, ...names: any[]) => {
      for (let i = 0; i < 5; i++) {
        args[i] = names[i] || args[i] || `$${i+1}`
      }
      return ""
    }
  )

const evaluate: SyntaxRule = (template, { varName: tmp, delimiters: [start, end] }) => 
  template.replace(
    new RegExp(`${start}([\\s\\S]+?(\\}?)+)${end}`,"g"), 
    (_, code) => `';${unescape(code)};${tmp}[0]+='`
  )

const rules: SyntaxRule[] = [
  variables,
  inlineTemplate,
  resolveDefs,
  format,
  interpolate,
  typeInterpolate,
  encode,
  conditional,
  iterate,
  evaluate
]

/* istanbul ignore next */
export const encodeHtml = (s: any) => {
  const rules: Record<string, string> = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': "&#34;", "'": "&#39;", "/": "&#47;" }
  return typeof s === "string" ? s.replace(/&(?!#?\w+;)|<|>|"|'|\//g, (m) => rules[m] || m) : s
}

const defaultOptions: TemplateOptions = {
  args: "it",
  varName: "$",
  delimiters: ["{{", "}}"],
  encoders: { "": encodeHtml },
  strip: false,
  def: {}
}

export const template = (body: string, options?: Partial<TemplateOptions>): RenderFunction => {
  const opts = { ...defaultOptions, def: {}, ...options } as TemplateOptions
  const { varName: tmp, delimiters: [s,e] } = opts
  const args = Array.isArray(opts.args) ? opts.args : [opts.args]
  const dependency = new Set<string>()
  const ctx: RuleContext = { ...opts, id: 1, args, dependency, delimiters: [escape(s), escape(e)] }

  rules.forEach((rule) => body = rule ? rule(body, ctx) : body)

  const encoders = [...ctx.dependency].map((enc) => `${enc || 'html'}: ${dumpEncoder(ctx, enc)}`).join(",")

  body = (`;${tmp}[0]='${body}';return ${tmp}[0];`)
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(new RegExp(`(\\s|;|\\}|^|\\{)${escape(tmp)}\\[0\\]\\+='';`, "g"), "$1") // remove empty strings
    .replace(/\+''/g, "")
  
  body = `const ${tmp} = {${encoders}}${body}`
  return new Function(...args, body) as RenderFunction
}

const dumpEncoder = (ctx: RuleContext, encName: string) => {
  const enc = ctx.encoders[encName]
  if (!enc) {
    throw new Error(`Unknown encoder "${encName}"`)
  }
  if (typeof enc === "function") {
    const code = enc.toString()
    if (code.indexOf("[native code]") > -1) {
      throw new Error(`Native function '${encName}' should be added to encoders as a string`)
    }
    return code
  }
  return enc
} 
