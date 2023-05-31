import React, { useEffect, useRef, useMemo, useState } from "react"
import {
    ComponentProps,
    Streamlit,
    withStreamlitConnection,
} from "streamlit-component-lib"
import _, { isObject } from "lodash"

import * as echarts from "echarts"
import "echarts-gl"
import "echarts-liquidfill"
import "echarts-wordcloud"
import ReactEcharts, { EChartsOption } from "echarts-for-react"

import deepMap from "./utils"

interface Map {
    mapName: string
    geoJson: object
    specialAreas: object
}

/**
 * Arguments Streamlit receives from the Python side
 */
interface PythonArgs {
    options: EChartsOption
    theme: string | object
    onEvents: any
    notMerge:boolean
    height: string
    width: string
    renderer: "canvas" | "svg"
    map: Map
}


const registerTheme = (themeProp: string | object) => {
    const customThemeName = "custom_theme"
    if (isObject(themeProp)) {
        echarts.registerTheme(customThemeName, themeProp)
    }
    return isObject(themeProp) ? customThemeName : themeProp
}

const JS_PLACEHOLDER = "--x_x--0_0--"
/**
     * If string can be evaluated as a Function, return activated function. Else return string.
     * @param s string to evaluate to function
     * @returns Function if can be evaluated as one, else input string
     */
const evalStringToFunction = (s: string) => {
    let funcReg = new RegExp(
        `${JS_PLACEHOLDER}\\s*(function\\s*.*)\\s*${JS_PLACEHOLDER}`
    )
    let match = funcReg.exec(s)
    if (match) {
        const funcStr = match[1]
        return new Function("return " + funcStr)()
    } else {
        return s
    }
}

/**
 * Deep map all values in an object to evaluate all strings as functions
 * We use this to look in all nested values of options for Pyecharts Javascript placeholder
 * @param obj object to deep map on
 * @returns object with all functions in values evaluated
 */
const evalStringToFunctionDeepMap = (obj: object) => {
    return deepMap(obj, evalStringToFunction, {})
}



const EchartsChart = (props: ComponentProps) => {
    const echartsElementRef = useRef<ReactEcharts | null>(null)
    const echartsInstanceRef = useRef<echarts.EChartsType | null>(null)
    const {
        options,
        theme,
        onEvents,
        notMerge,
        height,
        width,
        renderer,
        map,
    }: PythonArgs = props.args
    if (isObject(map)) {
        echarts.registerMap(map.mapName, map.geoJson, map.specialAreas)
    }
    const js_options = evalStringToFunctionDeepMap(options)
    const js_theme = registerTheme(theme)    
    const js_events = Object.fromEntries(
        Object.keys(onEvents).map((key) => {
            const eventFunction = onEvents[key]
            const callBack = (params: any) => {
                const s = evalStringToFunction(eventFunction)(params)
                Streamlit.setComponentValue(s)
            }
            return [key, callBack]
        })

    )
    console.log('rerendered')
    useEffect(() => {
        if (null === echartsElementRef.current) {
            return
        }
        echartsInstanceRef.current = echartsElementRef.current.getEchartsInstance()
    })

    return (
        <>
            <ReactEcharts
                ref={echartsElementRef}
                option={js_options}
                notMerge={notMerge}
                lazyUpdate={true}
                style={{ height: height, width: width }}
                theme={js_theme}
                onChartReady={() => {
                    Streamlit.setFrameHeight()                    
                }}
                onEvents={js_events}
                opts={{ renderer: renderer}}
            />
        </>
    )
}

// const EchartsMemo = React.memo(EchartsChart)
// Streamlit.setComponentValue call Streamlit to rerender, as st_echart is streamlit app's children, this component will be rerender too
// React only use shallow equal to decide when to rerender ,but Streamlit.setComponentValue seems to give a new object in props.args,even the object values not changed,
// In react , set props.somechild to a new create object will make call rerender
// use lodash deep equal to compare props , so this component won't rerender if the props values not changed.
const EchartsMemo = React.memo(EchartsChart, (prev, props) => {
    return _.isEqual(prev, props)
})

export default withStreamlitConnection(EchartsMemo)
