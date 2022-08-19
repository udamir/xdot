import { template as t } from "../src"

describe("custom delimiters", () => {
  describe("via config argument", () => {
    it("should replace delimiters for the current template only", () => {
      const cfg = {delimiters: {start: "<%", end: "%>"}}
      const tmplCustom = t("<%= it.foo %>", cfg)
      expect(tmplCustom({foo: "bar"})).toEqual("bar")
      const tmpl = t("{{= it.foo }}")
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })
  })

  describe("via global settings", () => {
    it("should replace delimiters for all templates", () => {
      const cfg = {delimiters: {start: "<%", end: "%>"}}
      const tmpl = t("<%= it.foo %>", cfg)
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })

    it("should be ok to pass the same delimiters", () => {
      const cfg = {delimiters: {start: "{{", end: "}}"}}
      const tmpl = t("{{= it.foo }}", cfg)
      expect(tmpl({foo: "bar"})).toEqual("bar")
    })
  })
})