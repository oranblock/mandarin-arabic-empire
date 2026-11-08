Here is a consolidated list of APIs and GitHub repositories you can use to build your gamified map, all gathered in one place.

🌐 APIs for City Information

admtp (Python SDK)

· Link: https://pypi.org/project/admtp/
· Description: A Python SDK based on official data from China's Ministry of Civil Affairs. It supports querying provinces, cities, and counties, with methods like get_county_by_name() and list_counties().

ShowAPI (行政区划查询)

· Link: https://www.showapi.com/guides/region-query-guides-1149
· Description: A free RESTful API that returns JSON data with administrative codes, postal codes, and pinyin. It supports 5 administrative levels (province → village) and is synced monthly with official data.

Apify (China Administrative Division Codes API)

· Link: https://apify.com/... (Available on the Apify platform)
· Description: Provides official PRC administrative division codes for 34 provinces, 333 prefectures, and 2,847 counties, allowing you to look up and validate codes.

Baidu Maps Administrative Division API

· Link: https://lbsyun.baidu.com/ (Search for "行政区划查询")
· Description: Allows you to query administrative names and boundary coordinates by keyword, covering county-level divisions.

天地图 API (Tianditu)

· Link: https://lbs.tianditu.gov.cn/
· Description: Provides HTTP/HTTPS interfaces to query center points, outlines, and parent administrative divisions based on names or codes.

---

📦 GitHub Repositories for GeoJSON Data

Supeset/China-GeoData

· Link: https://github.com/Supeset/China-GeoData
· Description: An open-source GIS dataset with correct national borders and complete administrative data. It includes a china_province_city_full.geojson file with 477 county-level boundaries.

zhChuXiao/ChinaGeoJson

· Link: https://github.com/zhChuXiao/ChinaGeoJson
· Description: Provides the latest county-level map JSON data from DataV.GeoAtlas, including an info.json file with hierarchy information and boundary coordinates.

xiangyuecn/AreaCity-JsSpider-StatsGov

· Link: https://github.com/xiangyuecn/AreaCity-JsSpider-StatsGov
· Description: A comprehensive dataset that includes coordinates and boundary data. It provides tools to convert data into GeoJSON format and links to a high-performance query tool (AreaCity-Query-Geometry).

echarts-maps/echarts-china-cities-js

· Link: https://github.com/echarts-maps/echarts-china-cities-js
· Description: Packages the GeoJSON maps of Chinese cities specifically for use with the ECharts library. It is a highly starred repository (over 580 stars).

echarts-maps/echarts-china-counties-js

· Link: https://github.com/echarts-maps/echarts-china-counties-js
· Description: Similar to the above, but specifically packages the maps of Chinese counties for ECharts, which is very relevant for your county-level map.

recallwei/geojson

· Link: https://github.com/recallwei/geojson
· Description: A repository containing GeoJSON data used to develop ECharts and D3 maps, including data for China.

---

🔤 Arabic Translation Resources

msamirakha/country-state-city-translate

· Link: https://github.com/msamirakha/country-state-city-translate
· Description: A basic library for country, state, and city data that supports both English and Arabic translations.

i18n-iso-cities

· Link: Available on npm and Snyk
· Description: A library providing multilingual city name translations. It is described as "Arabic-first" and community-driven, which could be a useful starting point.

argos-translate

· Link: https://github.com/argosopentech/argos-translate
· Description: An open-source offline translation library written in Python that supports a wide variety of languages, including Arabic and Chinese. You could potentially use it to programmatically generate translations for your city list.

---

💡 Additional NPM Packages

china_regions

· Link: https://cloud.tencent.cn/ (Search for "china_regions")
· Description: An open-source library providing complete province, city, and district-level data in JSON format, ideal for forms, dropdowns, and maps.

uiwjs/province-city-china

· Link: https://deps.dev/ (Search for "uiwjs/province-city-china")
· Description: Provides complete and updated China administrative division data (province, city, county, town) in JSON, CSV, and SQL formats.

@aurouscia/china-areas

· Link: https://www.npmjs.com/package/@aurouscia/china-areas
· Description: A package that provides administrative division data for mainland China in both flat and tree-structured JSON versions.

This collection should give you all the data sources and tools you need to build and expand your game. If you need help with the specific code to integrate any of these, feel free to ask.
