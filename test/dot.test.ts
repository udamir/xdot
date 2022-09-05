import { template as t, TemplateOptions, encodeHtml } from "../src"

const basictemplate = "<div>{{=it.foo}}</div>"
const basiccompiled = t(basictemplate)

describe("#template()", () => {
  it("should return a function", () => {
    expect(typeof basiccompiled).toEqual("function")
  })
})

describe("#()", () => {
  it("should render the template", () => {
    expect(basiccompiled({foo: "http"})).toEqual("<div>http</div>")
    expect(basiccompiled({foo: "http://abc.com"})).toEqual("<div>http://abc.com</div>")
    expect(basiccompiled({})).toEqual("<div>undefined</div>")
  })
})

describe("encoding with doNotSkipEncoded=false", () => {
  it("should not replace &", () => {
    expect(t("<div>{{=it.foo}}</div>")({foo: "&amp;"})).toEqual("<div>&amp;</div>")
  })
})

describe("handle eol", () => {
  it("should not remove eol", () => {
    expect(t("{{=it.foo}}  \n{{=it.foo}}")({foo: "2"})).toEqual("2  \n2")
    expect(t("{{=it.foo}}\n{{=it.foo}}")({foo: "2"})).toEqual("2\n2")
    expect(t("{{=it.foo}} {{=it.foo}}")({foo: "2"})).toEqual("2 2")
  })
  it("should remove eol", () => {
    expect(t("{{=it.foo}}{{-}}  \n{{=it.foo}}")({foo: "2"})).toEqual("22")
    expect(t("{{=it.foo}}{{-}}\n{{=it.foo}}")({foo: "2"})).toEqual("22")
    expect(t("{{=it.foo}}{{-}} {{=it.foo}}")({foo: "2"})).toEqual("22")
    expect(t("{{=it.foo}}\r {{-}} \n{{=it.foo}}")({foo: "2"})).toEqual("22")
  })
})

describe("interpolate 2 numbers", () => {
  it("should print numbers next to each other", () => {
    expect(t("{{=it.one}}{{=it.two}}")({one: 1, two: 2})).toEqual("12")
    expect(t("{{= it.one}}{{= it.two}}")({one: 1, two: 2})).toEqual("12")
    expect(t("{{= it.one }}{{= it.two }}")({one: 1, two: 2})).toEqual("12")
    expect(t("{{= it['one'] }}{{= it['two'] }}")({one: 1, two: 2})).toEqual("12")
    expect(t("{{:data=data.one}}{{:param=param.two}}")({one: 1, two: 2})).toEqual("12")
    expect(t("{{:{one}=one}}{{:{two}=two}}")({one: 1, two: 2})).toEqual("12")
  })
})

describe("type-safe interpolation", () => {
  it("should interpolate correct types", () => {
    expect(t("{{%n=it.num}}-{{%s=it.str}}-{{%b=it.bool}}")({num: 1, str: "foo", bool: true})).toEqual( "1-foo-true")
    expect(t("{{%n= it.num}}-{{%s= it.str}}-{{%b= it.bool}}")({num: 1, str: "foo", bool: true})).toEqual( "1-foo-true")
    expect(t("{{%n= it.num }}-{{%s= it.str }}-{{%b= it.bool }}")({num: 1, str: "foo", bool: true})).toEqual( "1-foo-true")     
  })

  it("should throw render-time exception on incorrect data types", () => {
    const numTmpl = t("{{%n=it.num}}")
    expect(numTmpl({num: 1})).toEqual("1")
    expect(() => numTmpl({num: "1"})).toThrowError()
    expect(() => numTmpl({num: true})).toThrowError()

    const strTmpl = t("{{%s=it.str}}")
    expect(strTmpl({str: "foo"})).toEqual("foo")
    expect(() => strTmpl({str: 1})).toThrowError()
    expect(() => strTmpl({str: true})).toThrowError()

    const boolTmpl = t("{{%b=it.bool}}")
    expect(boolTmpl({bool: true})).toEqual("true")
    expect(() => boolTmpl({bool: "true"})).toThrowError()
    expect(() => boolTmpl({bool: 1})).toThrowError()
  })
})

describe("evaluate JavaScript", () => {
  it("should print numbers next to each other", () => {
    expect(t("{{ it.one = 1; it.two = 2; }}{{= it.one }}{{= it.two }}")({})).toEqual("12")
  })
})

describe("no HTML encoding by default", () => {
  it("should NOT replace &", () => {
    expect(t("<div>{{=it.foo}}</div>")({foo: "&amp;"})).toEqual("<div>&amp;</div>")
    expect(t("{{=it.a}}")({a: "& < > / ' \""})).toEqual("& < > / ' \"")
    expect(t('{{="& < > / \' \\""}}')({})).toEqual("& < > / ' \"")
  })
})

describe("custom encoders", () => {
  describe("selfContained: false (default)", () => {
    it("should run specified encoder", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          str: "JSON.stringify",
          rx: (s) => new RegExp(s).toString(),
        },
      }
      expect(t("{{str! it}}", cfg)({foo: "bar"})).toEqual('{"foo":"bar"}')
      expect(t("{{rx! it.regex}}", cfg)({regex: "foo.*"})).toEqual("/foo.*/")
    })

    it("should encode HTML with provided encoder", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          "": encodeHtml,
        },
      }

      const tmpl = t("<div>{{!it.foo}}</div>", cfg)
      expect(tmpl({foo: "http://abc.com"})).toEqual("<div>http:&#47;&#47;abc.com</div>")
      expect(tmpl({foo: "&amp;"})).toEqual("<div>&amp;</div>")
    })

    it("should throw compile time exception if encoder is not specified", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          str: "JSON.stringify",
        },
      }
      expect(() => t("{{str! it}}", cfg)).not.toThrowError()
      expect(() => t("{{rx! it}}", cfg)).toThrowError(/Unknown encoder/)
    })
  })

  describe("selfContained: true", () => {
    it("should inline specified encoders passed as strings", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          str: "JSON.stringify",
          rx: "(s) => new RegExp(s).toString()",
        },
      }
      expect(t("{{str! it}}", cfg)({foo: "bar"})).toEqual('{"foo":"bar"}')
      expect(t("{{rx! it.regex}}", cfg)({regex: "foo.*"})).toEqual("/foo.*/")
    })

    it("should encode HTML with inlined HTML encoder", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          "": encodeHtml
        },
      }

      const tmpl = t("<div>{{!it.foo}}</div>", cfg)
      expect(tmpl({foo: "http://abc.com"})).toEqual("<div>http:&#47;&#47;abc.com</div>")
      expect(tmpl({foo: "&amp;"})).toEqual("<div>&amp;</div>")
    })

    it("should throw compile-time exception if encoder is not specified", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          str: "JSON.stringify",
        },
      }
      expect(() => t("{{str! it}}", cfg)).not.toThrowError()
      expect(() => t("{{rx! it}}", cfg)).toThrowError(/Unknown encoder/)
    })

    it("should throw compile-time exception if encoder is of incorrect type", () => {
      const cfg: Partial<TemplateOptions> = {
        encoders: {
          str: JSON.stringify,
          rx: "(s) => new RegExp(s).toString()",
        },
      }
      expect(() => t("{{str! it}}", cfg)).toThrowError()
      expect(() => t("{{rx! it}}", cfg)).not.toThrowError()
    })
  })
})

describe("context destructuring", () => {
  it('should interpolate custom arguments', () => {
    const tmpl = t("{{=foo}}{{=bar}}", {argName: "{ foo, bar }" })
    expect(tmpl({ foo: 1, bar: 2 })).toEqual("12")
  })
  it('should interpolate arguments defined in template', () => {
    const tmpl = t("{{:{foo,bar}=foo+bar}}")
    expect(tmpl({ foo: 1, bar: 2 })).toEqual("3")
  })
})

describe("invalid JS in templates", () => {
  it("should throw exception", () => {
    expect(() => t("<div>{{= foo + }}</div>")).toThrowError()
  })
})
