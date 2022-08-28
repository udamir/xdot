import { template as t } from "../src" 

describe("defines", () => {
  function testDef(tmpl: string, def={}) {
    const fn = t(tmpl, { def })
    expect(fn({foo: "http"})).toEqual("<div>http</div>")
    expect(fn({foo: "http://abc.com"})).toEqual("<div>http://abc.com</div>")
    expect(fn({})).toEqual("<div>undefined</div>")
  }

  describe("without parameters", () => {
    it("should render define", () => {
      testDef("{{##tmp:it:<div>{{=it.foo}}</div>#}}{{#def.tmp}}")
    })

    it("should render define if it is passed to compile", () => {
      testDef("{{#def.tmp}}", {tmp: "<div>{{=it.foo}}</div>"})
    })

    it("should render define if it is passed to compile", () => {
      expect(t("{{#def.tmp:it.foo}}", { def: {tmp: "<div>{{=it.a}}+{{=it.b}}</div>" }})({ foo: { a: 1, b: 2 } })).toEqual("<div>1+2</div>")
    })
  })

  describe("with parameters", () => {
    it("should render define", () => {
      testDef("{{##tmp:{foo}:<div>{{=foo}}</div>#}}{{ var bar = it }}{{# def.tmp:bar }}")
    })

    it("should render define multiline params", () => {
      testDef(
        "{{## tmp :data:{{=data.openTag}}{{=data.foo}}{{=data.closeTag}}#}}\n" +
          "{{# def.tmp:{\n" +
          "   foo: it.foo,\n" +
          '   openTag: "<div>",\n' +
          '   closeTag: "</div>"\n' +
          "} }}"
      )
    })

    it("should support func parameters", () => {
      expect(t(`{{## testFn=({a,b})=>a+b#}}{{#def.testFn:it}}`)({a:1, b:2})).toEqual('3')
    })

    function compiledDefinesParamTemplate(param: string) {
      return t(`{{##tmp:input:<div>{{=input.foo}}</div>#}}{{#def.tmp:${param}}}`)
    }

    it("should render define with standard parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it")
      expect(definesParamCompiled({foo: "A"})).toEqual("<div>A</div>")
      expect(definesParamCompiled({})).toEqual("<div>undefined</div>")
    })

    it("should render define with property parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it.bar")
      expect(definesParamCompiled({bar: {foo: "B"}})).toEqual("<div>B</div>")
      expect(() => definesParamCompiled({})).toThrowError()
    })

    it("should render define with square bracket property parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it['bar']")
      expect(definesParamCompiled({bar: {foo: "C"}})).toEqual("<div>C</div>")
      expect(() => definesParamCompiled({})).toThrowError()
    })

    it("should render define with square bracket property with space parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it['bar baz']")
      expect(definesParamCompiled({"bar baz": {foo: "D"}})).toEqual("<div>D</div>")
      expect(() => definesParamCompiled({})).toThrowError()
    })

    it("should render define with array index property parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it[1]")
      expect(definesParamCompiled(["not this", {foo: "E"}, "not this"])).toEqual("<div>E</div>")
      expect(() => definesParamCompiled({})).toThrowError()
    })

    it("should render define with deep properties parameter", () => {
      const definesParamCompiled = compiledDefinesParamTemplate("it['bar baz'].qux[1]")
      expect(definesParamCompiled({"bar baz": {qux: ["not this", {foo: "F"}, "not this"]}})).toEqual("<div>F</div>")
      expect(() => definesParamCompiled({})).toThrowError()
    })

    it("should render define with array literal as parameter", () => {
      const tmpl = t("{{## tmp:foo:{{~foo:x}}{{=x}}{{~}}#}}{{# def.tmp:[1,2,3] }}")
      expect(tmpl({})).toEqual("123")
    })
  })
})