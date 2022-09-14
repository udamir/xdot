import { template as t } from "../src"

describe("conditionals", () => {
  describe("without else", () => {
    const templates = [
      "{{?it.one < 2}}{{=it.one}}{{?}}{{=it.two}}",
      "{{? it.one < 2 }}{{= it.one }}{{?}}{{= it.two }}",
      "{{? it.one < 2 }}  \r{{= it.one }}\n  {{?}}   \n{{= it.two }}",
      " {{? it.one < 2 }}{{= it.one }}{{?}}\n {{? it.two}}  \n{{= it.two }}{{?}}",
    ]

    it("should evaluate condition and include template if valid", () => {
      expect(t(templates[0])({one: 1, two: 2})).toEqual("12")
      expect(t(templates[1])({one: 1, two: 2})).toEqual("12")
      expect(t(templates[2])({one: 1, two: 2})).toEqual("12")
      expect(t(templates[3])({one: 1, two: 2})).toEqual("12")
    })

    it("should evaluate condition and do NOT include template if invalid", () => {
      expect(t(templates[0])({one: 3, two: 2})).toEqual("2")
      expect(t(templates[1])({one: 3, two: 2})).toEqual("2")
      expect(t(templates[2])({one: 3, two: 2})).toEqual("2")
    })
  })

  describe("with else", () => {
    const templates = [
      "{{?it.one < 2}}{{=it.one}}{{??}}{{=it.two}}{{?}}",
      "{{? it.one < 2 }}{{= it.one }}{{??}}{{= it.two }}{{?}}",
    ]

    it('should evaluate condition and include "if" template if valid', () => {
      expect(t(templates[0])({one: 1, two: 2})).toEqual("1")
      expect(t(templates[1])({one: 1, two: 2})).toEqual("1")
    })

    it('should evaluate condition and include "else" template if invalid', () => {
      expect(t(templates[0])({one: 3, two: 2})).toEqual("2")
      expect(t(templates[1])({one: 3, two: 2})).toEqual("2")
    })
  })

  describe("with else if", () => {
    const templates = [
      "{{?it.one < 2}}{{=it.one}}{{??it.two < 3}}{{=it.two}}{{??}}{{=it.three}}{{?}}",
      "{{? it.one < 2 }}{{= it.one }}{{?? it.two < 3 }}{{= it.two }}{{??}}{{= it.three }}{{?}}",
    ]

    it('should evaluate condition and include "if" template if valid', () => {
      expect(t(templates[0])({one: 1, two: 2, three: 3})).toEqual("1")
      expect(t(templates[1])({one: 1, two: 2, three: 3})).toEqual("1")
    })

    it('should evaluate condition and include "else if" template if second condition valid', () => {
      expect(t(templates[0])({one: 10, two: 2, three: 3})).toEqual("2")
      expect(t(templates[1])({one: 10, two: 2, three: 3})).toEqual("2")
    })

    it('should evaluate condition and include "else" template if invalid', () => {
      expect(t(templates[0])({one: 10, two: 20, three: 3})).toEqual("3")
      expect(t(templates[1])({one: 10, two: 20, three: 3})).toEqual("3")
    })
  })
})