/**
 * ThermaBuild: English and Hindi strings for the report and the mason's build cards.
 * Ladakhi (Bhoti script) needs a native speaker's review before it can be added.
 */
(function (g) {
  'use strict';
  const L = {
    en: {
      lang: 'English',
      // report
      head_heat: 'At dawn on a {month} night, your home stays <span class="countup" id="res-temp-diff">{v}</span> warmer than an ordinary build.',
      head_cool: 'Your home stays <span class="countup" id="res-temp-diff">{v}</span> cooler at the hottest hour.',
      sub_heat: '{place}, {out} outside at dawn. Without a heater it holds {yours} inside; an ordinary build drops to {base}. Computed hour by hour on NASA POWER climate data.',
      sub_cool: '{place}, {out} outside at the peak. Yours peaks at {yours}; an ordinary build reaches {base}. Computed hour by hour on NASA POWER climate data.',
      tile_base_dawn: 'Ordinary build, at dawn', tile_opt_dawn: 'Your design, at dawn',
      head_heat_retro: 'After the upgrades, your home is <span class="countup" id="res-temp-diff">{v}</span> warmer at dawn on a {month} night.',
      head_cool_retro: 'After the upgrades, your home is <span class="countup" id="res-temp-diff">{v}</span> cooler at the hottest hour.',
      sub_heat_retro: '{place}, {out} outside at dawn. Without a heater your home drops to {base} today; after the upgrades it holds {yours}. Computed hour by hour on NASA POWER climate data.',
      sub_cool_retro: '{place}, {out} outside at the peak. Today your home reaches {base}; after the upgrades it peaks at {yours}.',
      tile_base_dawn_retro: 'Your home today, at dawn', tile_opt_dawn_retro: 'After upgrades, at dawn', tile_base_peak_retro: 'Your home today, peak', tile_opt_peak_retro: 'After upgrades, peak',
      lg_base_retro: 'Your home today', lg_opt_retro: 'After upgrades',
      tile_base_peak: 'Ordinary build, peak indoors', tile_opt_peak: 'Your design, peak indoors',
      tile_fuel: 'Heating fuel saved', tile_cool: 'Cooling energy saved', tile_air: 'Fresh-air changes', tile_pmv: 'Comfort (PMV)',
      chart_title_heat: 'Indoor temperature over three {month} nights', chart_title_cool: 'Indoor temperature over three {month} days',
      tab_typ: 'Typical', tab_snap_heat: 'Cold snap (−8 °C, cloudy)', tab_snap_cool: 'Heatwave (+4 °C)',
      lg_out: 'Outdoors', lg_base: 'Ordinary build', lg_opt: 'Your design', lg_band: 'Likely range (P10–P90)',
      rooms_title: 'Room by room', rooms_sub: 'Drag the timeline to see each room through the nights. Colour shows the temperature you would feel.',
      flows_title: 'Where the heat goes', flows_sub: 'Heat in and out on a typical day, kWh per day, with no heater.',
      g_solarWin: 'Sun through windows', g_solarTrombe: 'Trombe wall', g_solarOpaque: 'Sun on walls and roof', g_internal: 'People and cooking',
      l_windows: 'Through the glass', l_walls: 'Through the walls', l_roof: 'Through the roof', l_floor: 'Into the ground', l_vent: 'Fresh air and leaks', l_sky: 'To the night sky', l_trombeGlass: 'Trombe glass',
      yours: 'Yours', ordinary: 'Ordinary', gains: 'Heat in', losses: 'Heat out',
      why_title: 'Why this design works', why_sub: 'Each feature switched off in turn, and how much colder the dawn gets without it.',
      safety_title: 'Safety checks', safety_sub: 'Checked on every design. A design that fails the mould check is never recommended.',
      s_air: 'Fresh air for the stove and people', s_co2: 'Carbon dioxide at night', s_co: 'Carbon monoxide, worst case', s_mould: 'Mould and condensation', s_cold: 'Coldest night',
      cal_title: 'All year, hour by hour', cal_sub: 'Indoor temperature with no heating or cooling, one typical day per month.',
      fuel_title_heat: 'Fuel over a winter', fuel_title_cool: 'Electricity over a summer',
      fuel_sub_heat: 'To keep {heat}, burning kerosene in a 55 % efficient stove at ₹{price} a litre. Bedrooms stay unheated, as in most Ladakhi homes.',
      fuel_sub_cool: 'Air conditioning to hold 26 °C, at a COP of 3 and ₹8 a unit.',
      village: 'If {n} homes in {place} were built this way', village_note: 'saved every winter compared with ordinary builds',
      bom_title: 'Bill of materials', bom_sub: 'Quantities from the plan. Rates are indicative Leh-area 2025 figures for comparing options, not quotes.',
      bom_part: 'Part', bom_what: 'What', bom_qty: 'Quantity', bom_rate: 'Rate', bom_cost: 'Cost', bom_total: 'Envelope total', bom_extra: 'Extra over an ordinary build', bom_payback: 'Pays back in fuel', bom_carbon: 'Embodied carbon',
      build_title: 'Build it: steps for the mason', build_sub: 'Print these cards for the site. Each one is one A5 page.',
      method_title: 'How this was calculated',
      loading: 'Checking {n} designs for your site…',
      winters: 'winters', years: 'years',
    },
    hi: {
      lang: 'हिन्दी',
      head_heat: '{month} की रात में भोर के समय आपका घर साधारण घर से <span class="countup" id="res-temp-diff">{v}</span> ज़्यादा गर्म रहता है।',
      head_cool: 'सबसे गर्म समय पर आपका घर <span class="countup" id="res-temp-diff">{v}</span> ठंडा रहता है।',
      sub_heat: '{place}, भोर में बाहर {out}। बिना हीटर के अंदर {yours} रहता है; साधारण घर {base} तक गिर जाता है। NASA POWER जलवायु आँकड़ों पर घंटे-दर-घंटे गणना।',
      sub_cool: '{place}, दोपहर में बाहर {out}। आपका घर अधिकतम {yours}; साधारण घर {base}। NASA POWER आँकड़ों पर घंटे-दर-घंटे गणना।',
      tile_base_dawn: 'साधारण घर, भोर में', tile_opt_dawn: 'आपका डिज़ाइन, भोर में',
      head_heat_retro: 'सुधार के बाद {month} की रात में भोर के समय आपका घर <span class="countup" id="res-temp-diff">{v}</span> ज़्यादा गर्म रहता है।',
      head_cool_retro: 'सुधार के बाद सबसे गर्म समय पर आपका घर <span class="countup" id="res-temp-diff">{v}</span> ठंडा रहता है।',
      sub_heat_retro: '{place}, भोर में बाहर {out}। आज बिना हीटर के घर {base} तक गिरता है; सुधार के बाद {yours} रहता है।',
      sub_cool_retro: '{place}, दोपहर में बाहर {out}। आज घर {base} तक जाता है; सुधार के बाद {yours}।',
      tile_base_dawn_retro: 'आज आपका घर, भोर में', tile_opt_dawn_retro: 'सुधार के बाद, भोर में', tile_base_peak_retro: 'आज आपका घर, अधिकतम', tile_opt_peak_retro: 'सुधार के बाद, अधिकतम',
      lg_base_retro: 'आज आपका घर', lg_opt_retro: 'सुधार के बाद',
      tile_base_peak: 'साधारण घर, अधिकतम', tile_opt_peak: 'आपका डिज़ाइन, अधिकतम',
      tile_fuel: 'ईंधन की बचत', tile_cool: 'ठंडक की ऊर्जा बचत', tile_air: 'ताज़ी हवा (प्रति घंटा)', tile_pmv: 'आराम (PMV)',
      chart_title_heat: '{month} की तीन रातों में अंदर का तापमान', chart_title_cool: '{month} के तीन दिनों में अंदर का तापमान',
      tab_typ: 'सामान्य', tab_snap_heat: 'शीत लहर (−8 °C, बादल)', tab_snap_cool: 'लू (+4 °C)',
      lg_out: 'बाहर', lg_base: 'साधारण घर', lg_opt: 'आपका डिज़ाइन', lg_band: 'संभावित दायरा (P10–P90)',
      rooms_title: 'हर कमरा', rooms_sub: 'समय-रेखा खिसकाकर रात भर हर कमरे का तापमान देखें।',
      flows_title: 'गर्मी कहाँ जाती है', flows_sub: 'सामान्य दिन में गर्मी का आना-जाना, kWh प्रति दिन, बिना हीटर।',
      g_solarWin: 'खिड़कियों से धूप', g_solarTrombe: 'ट्रॉम्ब दीवार', g_solarOpaque: 'दीवार और छत पर धूप', g_internal: 'लोग और खाना पकाना',
      l_windows: 'शीशे से', l_walls: 'दीवारों से', l_roof: 'छत से', l_floor: 'ज़मीन में', l_vent: 'हवा और दरारें', l_sky: 'रात के आसमान को', l_trombeGlass: 'ट्रॉम्ब का शीशा',
      yours: 'आपका', ordinary: 'साधारण', gains: 'आने वाली गर्मी', losses: 'जाने वाली गर्मी',
      why_title: 'यह डिज़ाइन क्यों काम करता है', why_sub: 'हर चीज़ को एक-एक करके हटाकर देखा कि भोर कितनी ठंडी हो जाती है।',
      safety_title: 'सुरक्षा जाँच', safety_sub: 'हर डिज़ाइन पर जाँच। फफूंद की जाँच में फेल डिज़ाइन कभी नहीं सुझाया जाता।',
      s_air: 'चूल्हे और लोगों के लिए ताज़ी हवा', s_co2: 'रात में कार्बन डाइऑक्साइड', s_co: 'कार्बन मोनोऑक्साइड, सबसे बुरी स्थिति', s_mould: 'फफूंद और नमी', s_cold: 'सबसे ठंडी रात',
      cal_title: 'पूरा साल, घंटे-दर-घंटे', cal_sub: 'बिना हीटर या कूलर के अंदर का तापमान, हर महीने का एक सामान्य दिन।',
      fuel_title_heat: 'एक सर्दी का ईंधन', fuel_title_cool: 'एक गर्मी की बिजली',
      fuel_sub_heat: '{heat} रखने के लिए, 55 % कुशल चूल्हे में ₹{price} प्रति लीटर का मिट्टी का तेल। ज़्यादातर लद्दाखी घरों की तरह शयनकक्ष गर्म नहीं किए जाते।',
      fuel_sub_cool: '26 °C रखने के लिए AC, COP 3 और ₹8 प्रति यूनिट।',
      village: 'अगर {place} में {n} घर ऐसे बनें', village_note: 'हर सर्दी की बचत, साधारण घरों की तुलना में',
      bom_title: 'सामग्री सूची', bom_sub: 'मात्रा नक्शे से। दरें लेह क्षेत्र 2025 की अनुमानित हैं, कोटेशन नहीं।',
      bom_part: 'हिस्सा', bom_what: 'क्या', bom_qty: 'मात्रा', bom_rate: 'दर', bom_cost: 'लागत', bom_total: 'कुल लागत (ढाँचा)', bom_extra: 'साधारण घर से अतिरिक्त', bom_payback: 'ईंधन बचत से वसूली', bom_carbon: 'निहित कार्बन',
      build_title: 'कैसे बनाएँ: मिस्त्री के लिए कदम', build_sub: 'ये कार्ड साइट के लिए छापें। हर कार्ड एक A5 पन्ना।',
      method_title: 'गणना कैसे हुई',
      loading: 'आपकी जगह के लिए {n} डिज़ाइन जाँचे जा रहे हैं…',
      winters: 'सर्दियाँ', years: 'साल',
    },
  };

  // Build steps for the site team. {…} fields are filled from the chosen design.
  const BUILD = {
    heating: [
      { k: 'found', en: ['Foundation and damp course', 'Dig to firm soil below the local frost depth. Lay a stone footing, then 150 mm of dry gravel. Put {floorIns} insulation under the floor and a polythene damp course on top before the mud floor.'],
        hi: ['नींव और नमी रोक', 'स्थानीय पाला-गहराई से नीचे सख़्त मिट्टी तक खोदें। पत्थर की नींव, फिर 150 mm सूखी बजरी। मिट्टी के फ़र्श से पहले {floorIns} इन्सुलेशन और पॉलीथीन की परत बिछाएँ।'] },
      { k: 'walls', en: ['Walls', 'Build the walls in {wall}. Fix {ins} on the outside face, then a lime or mud render on mesh. Insulation outside keeps the heavy wall on the warm side where it can store heat.'],
        hi: ['दीवारें', 'दीवारें {wall} से बनाएँ। बाहर की ओर {ins} लगाएँ, फिर जाली पर चूने या मिट्टी का प्लास्टर। बाहर का इन्सुलेशन भारी दीवार को अंदर की गर्म तरफ़ रखता है ताकि वह गर्मी जमा कर सके।'] },
      { k: 'trombe', en: ['Trombe wall', 'On the south face, build {trombeA} m² of 300 mm dark mass wall. Paint it matt black or dark red. Fix {glass} 50–100 mm in front of it, sealed at the edges. No vents: it releases heat through the wall after sunset.'],
        hi: ['ट्रॉम्ब दीवार', 'दक्षिण की ओर {trombeA} m² की 300 mm मोटी गहरे रंग की दीवार बनाएँ। काला या गहरा लाल रंग करें। उसके 50–100 mm आगे {glass} लगाएँ, किनारे सील करें। सूरज ढलने के बाद दीवार से गर्मी अंदर आती है।'] },
      { k: 'glass', en: ['South windows and shutters', 'Put most of the glass on the south: about {win} m² of {glass}. Fit insulated timber shutters or quilted curtains and close them at dusk. Keep the south side free of trees and tall walls.'],
        hi: ['दक्षिण की खिड़कियाँ और शटर', 'ज़्यादातर शीशा दक्षिण में लगाएँ: लगभग {win} m² {glass}। इन्सुलेटेड लकड़ी के शटर या रज़ाई वाले पर्दे लगाएँ और शाम को बंद करें। दक्षिण की ओर पेड़ या ऊँची दीवार न हो।'] },
      { k: 'roof', en: ['Roof', 'Poplar rafters, then a willow-twig mat, then {roofIns}, then 100 mm of compacted mud with a slight slope. Carry the wall insulation up to meet the roof insulation so there is no cold gap at the top of the wall.'],
        hi: ['छत', 'पॉपलर की कड़ियाँ, फिर विलो की टहनियों की चटाई, फिर {roofIns}, फिर 100 mm दबाई हुई मिट्टी, हल्की ढलान के साथ। दीवार का इन्सुलेशन छत के इन्सुलेशन से मिलाएँ ताकि ऊपर ठंडा गैप न रहे।'] },
      { k: 'airtight', en: ['Sealing the gaps', 'Seal every window and door frame with lime-sand mortar or foam. Fit rubber seals on doors. Add a small entrance porch as an airlock on the east side. Aim for {ach} air changes an hour.'],
        hi: ['दरारें बंद करना', 'हर खिड़की-दरवाज़े की चौखट को चूने-रेत के मसाले या फ़ोम से सील करें। दरवाज़ों पर रबर सील लगाएँ। पूर्व की ओर छोटा बरामदा एयरलॉक की तरह बनाएँ। लक्ष्य: {ach} वायु बदलाव प्रति घंटा।'] },
      { k: 'vent', en: ['Fresh-air vent', 'People and the stove need {q} m³ of fresh air an hour. Fit a closable vent of about {ventCm2} cm² high on the wall near the stove. Never block it, even on the coldest night.'],
        hi: ['ताज़ी हवा का रोशनदान', 'लोगों और चूल्हे को हर घंटे {q} m³ ताज़ी हवा चाहिए। चूल्हे के पास दीवार में ऊपर लगभग {ventCm2} cm² का बंद होने वाला रोशनदान लगाएँ। सबसे ठंडी रात में भी इसे बंद न करें।'] },
      { k: 'stove', en: ['Stove and chimney', 'Use a bukhari with a sealed metal chimney that rises above the roof. Never burn kerosene or coal without a chimney indoors. A battery CO alarm costs less than a week of fuel.'],
        hi: ['चूल्हा और चिमनी', 'बुखारी को सील की हुई धातु की चिमनी के साथ इस्तेमाल करें जो छत से ऊपर जाए। घर के अंदर बिना चिमनी के मिट्टी का तेल या कोयला कभी न जलाएँ। बैटरी वाला CO अलार्म एक हफ़्ते के ईंधन से सस्ता है।'] },
    ],
    cooling: [
      { k: 'roof', en: ['Roof first', 'The roof takes the most sun. Insulate it ({roof}) and finish it white. A cool roof cuts the ceiling temperature more than any other single step.'],
        hi: ['पहले छत', 'छत पर सबसे ज़्यादा धूप पड़ती है। इन्सुलेशन ({roof}) लगाएँ और सफ़ेद रंग करें।'] },
      { k: 'walls', en: ['Walls', 'Build {wall}. Keep west walls solid and shaded; they take the hottest afternoon sun.'],
        hi: ['दीवारें', 'दीवारें {wall} से बनाएँ। पश्चिम की दीवार ठोस और छायादार रखें।'] },
      { k: 'shade', en: ['Shade the glass', 'Give south windows an overhang about one third of the window height. Use vertical fins or a verandah on east and west windows.'],
        hi: ['शीशे पर छाया', 'दक्षिण की खिड़कियों पर खिड़की की ऊँचाई के लगभग एक-तिहाई छज्जा। पूर्व-पश्चिम की खिड़कियों पर खड़ी पट्टियाँ या बरामदा।'] },
      { k: 'vent', en: ['Cross-ventilation', 'Place openings on opposite walls, facing the prevailing breeze. Open them at night to flush out the day’s heat and close them by mid-morning.'],
        hi: ['आर-पार हवा', 'आमने-सामने की दीवारों में खिड़कियाँ, हवा की दिशा में। रात को खोलें ताकि दिन की गर्मी निकल जाए, सुबह बंद करें।'] },
      { k: 'glass', en: ['Glazing', 'Use {glass}. It lets in daylight but blocks most of the sun’s heat.'],
        hi: ['शीशा', '{glass} लगाएँ। रोशनी आती है, गर्मी रुकती है।'] },
      { k: 'fans', en: ['Fans before air conditioning', 'A ceiling fan makes 3–4 °C more feel comfortable at a fraction of the power. Size air conditioning only for what remains.'],
        hi: ['पहले पंखा, फिर AC', 'छत का पंखा कम बिजली में 3–4 °C ज़्यादा आरामदायक बनाता है।'] },
    ],
  };

  let lang = 'en';
  try { lang = localStorage.getItem('tb-lang') || 'en'; } catch (e) { /* storage blocked */ }
  function t(key, vars) {
    let s = (L[lang] && L[lang][key]) || L.en[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.split(`{${k}}`).join(vars[k]); });
    return s;
  }
  function setLang(l) { lang = l; try { localStorage.setItem('tb-lang', l); } catch (e) { /* ignore */ } }
  g.TBi18n = { t, setLang, get lang() { return lang; }, BUILD, L };
})(window);
