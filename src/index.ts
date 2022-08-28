export type Encoder = (data: any) => string

export interface TemplateOptions {
  argName: string // default argument name
  encoders: Record<string, Encoder | string>
  strip: boolean
  varName: string // internal variable name
  delimiters: [string, string]
  def: Definitions
}

export type RenderFunction = (...args: any[]) => string
type RuleContext = TemplateOptions & { id: number, dependency: Set<string>, start: string, end: string }
type SyntaxRule = (template: string, ctx: RuleContext) => string
type Definitions = Record<string, Function | any>
type TypePrefix = "n" | "s" | "b"

const TYPES: Record<TypePrefix, string> = { n: "number", s: "string", b: "boolean" }

const escape = (str: string) => str.replace(/([{}[\]()<>\\\/^$\-.+*?!=|&:])/g, "\\$1")
const unescape = (code: string) => code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, " ")

const inlineTemplate: SyntaxRule = (t, ctx): string => {
  const { start, end, def } = ctx
  return t.replace(
    new RegExp(`${start}##\\s*([\\w\\.$]+)\\s*(?:\\:(\\s*(?:\\{\\s*[\\s\\S]+?\\s*\})|(?:[\\s\\S]+?)))?\\s*(\\:|=)([\\s\\S]+?)\\s*#${end}(?:\\s*(\\r\\n|\\r|\\n))?`,"g"),
    (_, code: string, argName: string, assign: string, tmpl: string, eol: string) => {
      if (code.indexOf("def.") === 0) {
        code = code.substring(4)
      }
      if (!(code in def)) {
        if (assign === ":") {
          def[code] = template(tmpl, { ...ctx, argName: argName || ctx.argName })
        } else {
          if (argName) {
            throw new Error(`Unexpected arguments: ${_}`)
          }
          new Function("def", `def['${code}']=${tmpl}`)(def)
        }
      }
      return ""
    }
  )
}

const resolveDefs: SyntaxRule = (t, ctx): string => {
  const { start, end, def, dependency, varName: v } = ctx
  return t.replace(
    new RegExp(`${start}#\\s*def(?:\\.|\\[[\\'\\"])([\\w$]+)(?:[\\'\\"]\\])?\\s*(?:\\:\\s*([\\s\\S]+?))?\\s*${end}(?:\\s*(\\r\\n|\\r|\\n))?`, "g"),
    (_, name: string, param: string, eol: string) => {
      if (typeof def[name] === "function") {
        if (!dependency.has(name)) {
          dependency.add(`def.${name}`)
        }
        return `{{=${v}.${name}(${param ? stripTemplate(param, { ...ctx, strip: true }) : ctx.argName})}}`
      } else {
        let tmpl = def[name]
        tmpl = param ? tmpl.replace(new RegExp(`(^|[^\\w$])${ctx.argName}([^\\w$])`, "g"),`$1${param}$2`) : tmpl
        return tmpl ? resolveDefs(tmpl, ctx) : tmpl
      }
    }
  )
}

const stripTemplate: SyntaxRule = (t, { strip }) => 
  !strip ? t : t.trim()
    .replace(/[\t ]+(\r|\n)/g, "\n") // remove trailing spaces
    .replace(/(\r|\n)[\t ]+/g, " ") // leading spaces reduced to " "
    .replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g, "") // remove breaks, tabs and JS comments

const escapeQuotes: SyntaxRule = (t) => t.replace(/'|\\/g, "\\$&")

const interpolate: SyntaxRule = (t, { argName, start, end, varName: v }) =>
  t.replace(
    new RegExp(`${start}(?:\\:\\s*((?:\\{[\\s\\S]+?\\})|(?:[\\w]+?))\\s*)?=([\\s\\S]+?)${end}`, "g"),
    (_, arg, code) => arg 
      ? `';{const ${arg}=${argName};${v}[0]+=(${unescape(code)})};${v}[0]+='` 
      : `'+(${unescape(code)})+'`
  )

const typeInterpolate: SyntaxRule = (t, ctx) => {
  const { start, end, varName: v } = ctx
  return t.replace(
    new RegExp(`${start}%([nsb])=([\\s\\S]+?)${end}`, "g"),
    (_, typ: TypePrefix, code) => {
      const val = `${v}[${ctx.id++}]`
      const error = `throw new Error("expected ${TYPES[typ]}, got "+ (typeof ${val}))`
      return `';${val}=(${unescape(code)});if(typeof ${val}!=="${TYPES[typ]}") ${error};${v}[0]+=${val}+'`
    }
  )
}

const encode: SyntaxRule = (t, { start, end, dependency, varName: v }) => 
  t.replace(
    new RegExp(`${start}([a-z_$]+[\\w$]*)?!([\\s\\S]+?)${end}`,"g"), 
    (_, enc = "", code) => {
      dependency.add(enc || "")
      return `'+${v}.${enc || "html"}(${unescape(code)})+'`
    }
  )

const conditional: SyntaxRule = (t, { varName: v, start, end }) =>
  t.replace(
    new RegExp(`${start}\\?(\\?)?\\s*([\\s\\S]*?)\\s*${end}(\\r\\n|\\r|\\n)?`, "g"),
    (_, elseCase, code, eol) => {
      return code
        ? `';${elseCase ? "}else " : ""}if(${unescape(code)}){${v}[0]+='`
        : elseCase ? `';}else{${v}[0]+='` : `';}${v}[0]+='`
    }
  )

const iterate: SyntaxRule = (t, ctx) => {
  const { varName: v, start, end } = ctx
  return t.replace(
    new RegExp(`${start}(~+)\\s*(?:${end}|([\\s\\S]+?)\\s*\\:\\s*([\\w$]+)\\s*(?:\\:\\s*([\\w$]+))?\\s*${end})(\\r\\n|\\r|\\n)?`,"g"), 
    (_, loop, arr, vName, iName, eol) => {
      if (!arr) return `';}}${v}[0]+='`
      const [defI, incI] = iName ? [`let ${iName}=-1;`,`${iName}++;`] : ["", ""]
      const val = `${v}[${ctx.id++}]`
      switch (loop) {
        case "~":
          return `';${val}=${unescape(arr)};if(${val}){${defI}for (const ${vName} of ${val}){${incI}${v}[0]+='`
        case "~~":
          const iter = iName ? `[${iName}, ${vName}] of Object.entries` : `${vName} of Object.values`
          return `';${val}=${unescape(arr)};if(${val}){for (const ${iter}(${val})){${v}[0]+='`
        default:
          throw new Error(`unsupported syntax: ${loop} ${arr}:${vName}`)
      }
    }
  )
}

const evaluate: SyntaxRule = (t, { varName: tmp, start, end }) => 
  t.replace(
    new RegExp(`${start}([\\s\\S]+?(\\}?)+)${end}`,"g"), 
    (_, code) => `';${unescape(code)};${tmp}[0]+='`
  )

const rules: SyntaxRule[] = [
  inlineTemplate,
  resolveDefs,
  stripTemplate,
  escapeQuotes,
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
  argName: "it",
  varName: "$",
  delimiters: ["{{", "}}"],
  encoders: { "": encodeHtml },
  strip: false,
  def: {}
}

export const template = (body: string, options?: Partial<TemplateOptions>): RenderFunction => {
  const opts = { ...defaultOptions, def: {}, ...options } as TemplateOptions
  const { argName, varName: tmp, delimiters: [s,e] } = opts
  const dependency = new Set<string>()
  const ctx: RuleContext = { ...opts, id: 1, dependency, start: escape(s), end: escape(e) }

  rules.forEach((rule) => body = rule ? rule(body, ctx) : body)

  const encoders = [...ctx.dependency]
    .map((dep) => `${dep.indexOf("def.") !== 0 ? dep || 'html' : dep.slice(4) }: ${depFunc(dep, ctx)}`)
    .join(",")

  body = (`;${tmp}[0]='${body}';return ${tmp}[0];`)
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r")
    .replace(new RegExp(`(\\s|;|\\}|^|\\{)${escape(tmp)}\\[0\\]\\+='';`, "g"), "$1") // remove empty strings
    .replace(/\+''/g, "")
  
  body = `const ${tmp} = {${encoders}}${body}`
  return new Function(argName, body) as RenderFunction
}

const depFunc = (dep: string, ctx: RuleContext) => {
  const enc = dep.indexOf("def.") !== 0
  const fn =  enc ? ctx.encoders[dep] : ctx.def[dep.substring(4)]
  if (!fn) {
    throw new Error(`Unknown ${ enc ? "encoder" : "definition" } "${dep}"`)
  }
  if (typeof fn === "function") {
    const code = fn.toString()
    if (code.indexOf("[native code]") > -1) {
      throw new Error(`Native function '${dep}' should be added to encoders as a string`)
    }
    return code
  }
  return fn
} 
