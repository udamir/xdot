import { template as t } from "../src"

describe("custom delimiters", () => {
  describe("via config argument", () => {
    it("should replace delimiters for the current template only", () => {
      const tmplCustom = t("<%= it.foo %>", { delimiters: ["<%", "%>"] })
      expect(tmplCustom({foo: "bar"})).toEqual("bar")
      const tmpl = t("{{= it.foo }}")
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })
  })

  describe("via global settings", () => {
    it("should replace delimiters for all templates", () => {
      const tmpl = t("<%= it.foo %>", { delimiters: ["<%", "%>"] })
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })

    it("should be ok to pass the same delimiters", () => {
      const tmpl = t("{{= it.foo }}", { delimiters: ["{{", "}}"] })
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })
  })
})