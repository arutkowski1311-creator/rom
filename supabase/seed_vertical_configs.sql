-- Fly Fishing
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'fly_fishing', 'Fly Fishing', '🎣',
  'Write with the quiet confidence of an expert guide who has fished this water hundreds of times. Tone is tactical, anticipatory, and subtly excited — like a friend who knows exactly where the fish are and cannot wait to show you. Use fly fishing language naturally: hatches, seams, takes, presentations, drifts, rises. Never explain basic terms — assume the guest is ready to learn. Reference actual conditions pulled from today''s data. The guest should feel like they are getting insider access that money alone cannot buy.',
  ARRAY['tactical','anticipatory','knowledgeable','confident','quiet excitement'],
  'Structure the day around fish behavior and light, not the clock. Dawn and dusk are premium windows — schedule the best water for those times. Midday heat = slower fishing = good time for lunch, casting instruction, or moving between spots. Reference hatch timing if available.',
  '["Fishing license (required)","Waders and wading boots","Polarized sunglasses","Layers (mornings are cold even in summer)","Rain jacket","Snacks and water","Sunscreen and hat","Camera or phone for photos","Cash for tip"]'::jsonb,
  '["All fly fishing tackle and flies","Fly rod and reel","Leaders and tippet","Net","Forceps and nippers","Dry bags for gear","Lunch (full day trips)","First aid kit"]'::jsonb,
  'Today''s Water Conditions',
  ARRAY['water_flow','water_temp','weather','hatch_report','lunar_phase'],
  'Write this section as if the guide is sending a personal text the night before the trip. Reference the actual conditions — water temp, flow rate, what''s hatching. Give one specific piece of tactical advice that only someone who fished this water yesterday would know. End with something that builds genuine anticipation. 3-4 sentences.',
  '{"primary_cta":"Share your catch photo","secondary_cta":"Book your next trip","review_prompt":"How was the fishing? Leave a review and help other anglers find us.","rebook_incentive":"Book your next trip before you leave and lock in this season''s dates."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Today''s Water Report","what_to_expect":"What the Day Looks Like","notes_from_guide":"A Note From Your Guide"},"hide_sections":["add_ons"]}'::jsonb,
  '{"january":"Ice fishing possible in northern markets. Midwinter stillwater and tailwater fishing in southern markets.","february":"Midges and blue-winged olives beginning in tailwaters. Water running cold — nymphing most productive.","march":"Early season opener in many states. Runoff beginning. High dirty water possible. Streamer fishing strong.","april":"Runoff peak in mountain markets. Lower elevation rivers coming into shape. Blue-winged olive hatches.","may":"Prime early season. Caddis and PMD hatches beginning. Water dropping and clearing. Excellent dry fly fishing.","june":"Peak season begins. Salmonfly and golden stonefly hatches in western markets. Long days, excellent evening fishing.","july":"Summer heat. Fish early and late. Terrestrial season — hoppers, ants, beetles. Afternoon thunderstorms common.","august":"Terrestrial peak. Trico hatches in the morning. Fish sluggish midday. Best fishing dawn to 10am and 5pm to dark.","september":"Fall transition. Brown trout beginning to stage. Streamer fishing excellent. Cooler temps improve all-day fishing.","october":"Fall colors peak. Brown trout pre-spawn aggression. Streamer fishing best of the year. Crowds thin.","november":"Late season. Cold mornings. Midday fishing best. Nymphing and streamer focus.","december":"Winter fishing. Tailwaters and spring creeks most productive. Midges dominant."}'::jsonb
);

-- Hiking
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'hiking', 'Hiking & Mountaineering', '🏔️',
  'Write with calm authority and deep respect for the mountain environment. Tone is prepared, educational, and quietly inspiring — like an experienced friend who has summited this peak dozens of times and wants to make sure you have the best possible experience. Reference terrain, elevation gain, what guests will see and feel at key moments. Never minimize difficulty — be honest and build confidence through preparation.',
  ARRAY['prepared','inspiring','educational','confident','honest'],
  'Structure around elevation and exertion, not the clock. Alpine starts to beat afternoon storms and crowds at summit. Reference sunrise time for alpine starts. Note estimated time at key landmarks. Always include descent timing — many guests underestimate how long coming down takes.',
  '["Sturdy hiking boots (broken in)","Moisture-wicking layers","Waterproof rain jacket","Warm mid-layer (even in summer)","Trekking poles (recommended)","Minimum 2 liters of water","High-energy snacks and lunch","Sunscreen and lip balm","Sunglasses","Small daypack","Cash for tip"]'::jsonb,
  '["Topographic maps","Navigation (GPS/compass)","First aid kit","Emergency shelter","Extra water","Group snacks","Technical equipment if needed"]'::jsonb,
  'Trail & Summit Conditions',
  ARRAY['weather','trail_conditions','sunrise_sunset','snow_level','wind'],
  'Write this as a personal briefing the night before. Reference current trail conditions — snow level if applicable, any known hazards, what the summit view has been like this week. Give one piece of advice only someone who hiked this trail last week would know. Build genuine anticipation. 3-5 sentences.',
  '{"primary_cta":"Share your summit photo","secondary_cta":"Book your next adventure","review_prompt":"Leave a review and help other hikers find a great guide.","rebook_incentive":"Ask about our other routes — we have year-round adventures."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Trail & Summit Report","what_to_expect":"The Terrain Ahead","notes_from_guide":"From Your Guide"},"timeline_label":"The Route"}'::jsonb,
  '{"january":"Winter mountaineering season. Snowshoe and crampons required at elevation. Short days.","february":"Deep winter. Avalanche awareness critical. Best views of the year on clear days.","march":"Transitional. Snow still heavy at elevation but lower trails clearing. Mud season beginning.","april":"Mud season. Many trails soft and fragile. Stick to well-drained rocky trails.","may":"Snow melting fast. Waterfalls at peak flow. Trail conditions variable by elevation.","june":"High trails opening. Wildflowers beginning at lower elevation. Some snow on north faces.","july":"Peak wildflower season. Afternoon thunderstorms common — start early, be off summits by noon.","august":"Best all-around hiking month. Wildflowers still present. Thunderstorm risk remains.","september":"Crowds thin. Foliage begins. Crisp mornings. Best photography of the year.","october":"Peak foliage in most markets. Cold nights. Snow possible at elevation.","november":"Late season. Many trails manageable with layers. Snow building at elevation.","december":"Winter conditions at elevation. Snowshoes or microspikes required. Short days."}'::jsonb
);

-- Rock Climbing
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'rock_climbing', 'Rock Climbing', '🧗',
  'Write with the approachable expertise of a climbing guide who genuinely loves introducing people to vertical terrain. Tone is encouraging, safety-conscious, and stoked — like a mentor who wants you to succeed and knows you will. Use climbing terminology naturally: pitches, anchors, beta, cruxes, exposure. Be honest about the commitment without being intimidating.',
  ARRAY['encouraging','safety-first','stoked','expert','supportive'],
  'Structure around rock temperature and conditions. Best climbing: cool temps, no direct sun on the rock face, dry conditions. Morning: meet at crag, gear up, warm up on easier terrain. Mid-morning: move to main objective. Afternoon: continue if conditions allow or wrap up.',
  '["Comfortable athletic clothes you can move in","Approach shoes or sneakers for the hike in","Layers for morning cold","Sunscreen","Water (2+ liters)","Snacks","Cash for tip"]'::jsonb,
  '["Climbing harness (fitted to you)","Climbing shoes","Helmet","All protection and anchoring gear","Rope","Belay devices","First aid kit","Chalk bags"]'::jsonb,
  'Rock & Weather Conditions',
  ARRAY['weather','temperature','wind','precipitation'],
  'Write as a direct, encouraging note from guide to climber. Reference today''s rock conditions — temperature is everything in climbing. Note which specific routes are on the agenda and why. End with something that builds confidence. 3-4 sentences.',
  '{"primary_cta":"Share your climb photo","secondary_cta":"Book your next climbing day","review_prompt":"Review helps other new climbers find a trusted guide.","rebook_incentive":"Ready to try your first multi-pitch? Ask about our next-level programs."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Rock & Weather Report","what_to_expect":"What to Expect on the Wall"},"timeline_label":"The Climb"}'::jsonb,
  '{"march":"Excellent shoulder season. Cool temps, good friction.","april":"Prime spring climbing. Dry rock, cool mornings.","may":"Good climbing. Watch for afternoon heat building.","june":"Start early to beat heat. Shade routes preferred.","july":"Heat is the enemy. Dawn starts, done by noon.","august":"Same as July. North-facing and shaded crags only.","september":"Excellent fall climbing. Temps cooling. Best season.","october":"Prime fall season. Crisp temps, perfect friction.","november":"Late season. Cold mornings. Midday climbing best.","december":"Winter climbing in southern markets. Ice climbing season begins."}'::jsonb
);

-- Hunting
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'hunting', 'Guided Hunting', '🦌',
  'Write with the focused reverence of a guide who takes hunting seriously as both a skill and a tradition. Tone is tactical, respectful of the animal and the land, and quietly confident. Reference specific species, terrain, sign that has been found recently. Never glorify the kill — focus on the craft, the patience, and the deep connection to land and tradition.',
  ARRAY['tactical','reverent','traditional','patient','land-connected'],
  'Structure around animal behavior and legal shooting light. Pre-dawn: meeting, loading up, access to stand before legal light. Morning: prime movement window. Midday: food plot checks, scouting, rest. Afternoon: back in position for evening movement.',
  '["Valid hunting license and tags (required)","Appropriate camouflage or earth tones","Scent control clothing and spray","Layered warm clothing","Face mask and gloves","Rubber boots","Your firearm or bow","Ammunition or arrows","Cash for tip"]'::jsonb,
  '["Stand access and placement knowledge","Scouting intelligence from the past week","Field dressing assistance on success","Navigation and access","First aid kit"]'::jsonb,
  'Conditions & Recent Sign',
  ARRAY['weather','temperature','wind','moon_phase'],
  'Write as a guide who was out scouting this week. Reference recent sign — tracks, rubs, scrapes, feeding activity. Note wind direction and how it affects today''s approach. Reference the moon phase. Give one tactical insight that could make the difference today. 3-4 sentences.',
  '{"primary_cta":"Share your harvest photo","secondary_cta":"Book your next season","review_prompt":"Help other hunters find a knowledgeable local guide.","rebook_incentive":"Different seasons, different species. Ask about our spring turkey or waterfowl seasons."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Field Conditions & Recent Activity","timeline":"The Day''s Strategy","what_to_expect":"What to Prepare For"}}'::jsonb,
  '{"september":"Early archery season. Deer in bachelor groups. Scouting key.","october":"Pre-rut. Scrapes and rubs appearing. Bucks moving more.","november":"Peak rut. Best of the year for mature buck activity.","december":"Post-rut. Cold. Deer focused on food. Stand hunting effective.","january":"Late season. Very cold. Food source hunting.","april":"Spring turkey season. Gobblers responding to calls.","may":"Late spring turkey. Best calling of the season."}'::jsonb
);

-- Wildlife Safari
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'wildlife_safari', 'Wildlife & Nature Tour', '🦅',
  'Write with the quiet wonder of a naturalist who has been watching these animals for years and still gets excited every single morning. Tone is educational, wonder-forward, and genuinely enthusiastic. Reference specific species likely to be encountered based on season and location. The guest should feel like they are going out with a scientist who is also great company.',
  ARRAY['wonder','educational','naturalist','patient','observant'],
  'Structure entirely around animal behavior and optimal viewing windows. Dawn and dusk are prime — animals are most active. Midday: slower activity, good for landscape, plant identification, geological context. Build patience into the itinerary — wildlife watching requires stillness.',
  '["Binoculars (essential — 8x42 recommended)","Camera with zoom lens if you have one","Neutral or earth-toned clothing","Layers for morning cold","Comfortable walking shoes","Water and snacks","Cash for tip"]'::jsonb,
  '["Spotting scope for long-distance viewing","Expert species identification","Transport in appropriate vehicle","Maps and field reference materials","First aid kit"]'::jsonb,
  'Wildlife Activity Forecast',
  ARRAY['weather','wildlife_activity','sunrise_sunset','migration_calendar'],
  'Write as a naturalist briefing the night before. Reference what has been seen in this area in the past week — specific species, locations, behaviors. Note what time of day has been most productive and why. Give the guest one thing to watch for that most people miss. 4-5 sentences.',
  '{"primary_cta":"Share your wildlife photos","secondary_cta":"Book a different season for different species","review_prompt":"Help other nature lovers find an expert guide.","rebook_incentive":"Every season brings different species and behaviors."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Recent Wildlife Activity","timeline":"Today''s Viewing Strategy","what_to_expect":"What You Might Encounter"},"timeline_label":"The Day Afield"}'::jsonb,
  '{"january":"Winter wildlife. Bald eagles. Wolves active in open terrain. Excellent tracking conditions.","february":"Late winter. Great gray owls hunting. Bears not yet out. Early courtship behaviors.","march":"Bears emerging from dens. Elk and bison calving beginning.","april":"Calving season. Bear activity high. Migratory birds arriving. Excellent for birding.","may":"Peak baby season. Calves, cubs, pups everywhere. Wildflower context adds to experience.","june":"Excellent all-species viewing. Long days. Grizzlies and black bears with cubs.","july":"Peak summer. Full complement of species active. Early mornings essential.","august":"Pre-rut tension building. Pronghorn and elk behavior shifting.","september":"RUT SEASON begins for elk. Bulls bugling. Most dramatic wildlife behavior of the year.","october":"Peak rut for elk and deer. Bears hyperphagia before hibernation.","november":"Late fall. Bears entering dens. Elk rut winding down. Excellent predator activity.","december":"Winter conditions. Wolf packs active. Excellent tracking and predator-prey observation."}'::jsonb
);

-- Whitewater
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'whitewater', 'Whitewater Rafting & Kayaking', '🌊',
  'Write with the confident energy of a river guide who has run this stretch hundreds of times and still gets pumped for every put-in. Tone is safety-conscious, fun, and river-knowledgeable. Reference actual water levels and flow — CFS is everything in whitewater. Name the rapids, describe what makes each one exciting. Balance honest safety briefing energy with genuine stoke.',
  ARRAY['safety-focused','fun','river-knowledgeable','energetic','honest'],
  'Structure around the river itself. Put-in logistics and safety briefing first. Then the river unfolds sequentially: flatwater warmup, first rapids building in intensity, big water features, recovery pools, take-out. Build in swimming hole or lunch stop on full-day trips.',
  '["Swimwear (worn under wetsuit if provided)","Water shoes or old sneakers with closed toe","Change of clothes and towel for after","Sunscreen (waterproof)","Sunglasses with strap","Leave valuables in the car","Cash for tip"]'::jsonb,
  '["Raft or kayak","Paddles","Personal flotation device (PFD)","Helmet","Wetsuit if water is cold","Dry bags","First aid and rescue equipment","Shuttle logistics"]'::jsonb,
  'River Conditions',
  ARRAY['water_flow','water_temp','weather'],
  'Write as a guide who ran this section recently. Reference the current CFS and what it means for today. Name the signature rapid and build genuine anticipation. Let the guest know what the safety briefing will cover so they arrive mentally ready. 3-4 sentences.',
  '{"primary_cta":"Share your river photos","secondary_cta":"Book a different section or level","review_prompt":"Help other adventurers find the best river guides.","rebook_incentive":"Different flows create completely different experiences."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"River Report","timeline":"The River Run","what_to_expect":"What to Expect on the Water"}}'::jsonb,
  '{"march":"Runoff beginning. Water rising. Powerful spring flows.","april":"High water. Big waves. Exciting but commitment required.","may":"Peak spring runoff in mountain markets. Biggest water of year.","june":"Excellent flows. Water dropping from peak. Best all-around.","july":"Good summer flows. Water warming. Family-friendly timing.","august":"Late summer lower flows. More technical.","september":"Excellent flows returning in some markets. Less crowded.","october":"Season winding down in most markets."}'::jsonb
);

-- Food Tour
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'food_tour', 'Food & Culinary Tour', '🍽️',
  'Write with genuine warmth and deep enthusiasm for food culture, place, and the human stories behind what people eat. Tone is inviting, sensory, and storytelling-forward — like a friend who grew up here and cannot wait to show you their favorite places. Use sensory language: flavors, textures, aromas. Never be clinical or listy.',
  ARRAY['warm','sensory','storytelling','enthusiastic','personal'],
  'Structure around appetite and discovery rhythm. Pace matters — guests need time to taste and absorb. Early stops: lighter bites. Middle stops: the anchors, most memorable flavors. Final stops: something sweet or celebratory. Walking time between stops is part of the experience.',
  '["Comfortable walking shoes","Light layers (indoor/outdoor changes)","An empty stomach — come hungry","Camera or phone for food photos","Cash for additional purchases","Reusable bag if you plan to shop"]'::jsonb,
  '["All food tastings included","Drinks at each stop","Expert food and cultural commentary","Behind-the-scenes access where available"]'::jsonb,
  'What''s In Season Right Now',
  ARRAY['weather','seasonal_ingredients','local_events'],
  'Write as an enthusiastic personal note about what makes today''s tour special. Reference one specific thing in season right now. Name one stop and say something genuine about why it''s your favorite. 3-4 sentences. Warm, personal, never corporate.',
  '{"primary_cta":"Share your food photos","secondary_cta":"Book our next tour","review_prompt":"Your review helps other food lovers find this experience.","rebook_incentive":"Our seasonal menu changes — come back in a different season."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"What''s In Season & Happening Now","timeline":"Your Tasting Journey","what_to_bring":"What to Know Before You Come","notes_from_guide":"A Note From Your Guide"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"january":"Root vegetables, storage apples, aged cheeses. Hearty winter comfort food.","february":"Citrus arriving. Forced greenhouse greens.","march":"First spring greens. Ramps and fiddleheads in eastern markets.","april":"Asparagus. Morel mushrooms. Spring peas. Menus lightening up.","may":"Strawberries beginning. Spring herbs everywhere. Farmers markets opening.","june":"Peak berry season. Early stone fruit. Farmers markets in full swing.","july":"Corn, tomatoes, zucchini, blueberries. Summer abundance.","august":"Peak summer produce. Heirloom tomatoes. Peaches. Blackberries.","september":"Apple season begins. Fall squash arriving. Harvest abundance.","october":"Peak apple and pear. Root vegetables returning. Cider season.","november":"Late fall harvest. Wild mushrooms. Thanksgiving adjacent menus.","december":"Holiday flavors. Preserved and fermented foods. Comfort and celebration."}'::jsonb
);

-- Paddling
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'paddling', 'Canoeing & Kayaking', '🛶',
  'Write with the quiet appreciation of a paddler who finds something new on every stretch of water. Tone is peaceful, observant, and gently adventurous. Reference the specific waterway, what wildlife to watch for from the water, the character of the landscape as seen from river level.',
  ARRAY['peaceful','observant','nature-focused','gentle','experiential'],
  'Structure around the water and what changes as you move through it. Dawn paddles offer wildlife and mist. Morning paddles offer light and energy. Reference wind — calm mornings are best on open water. Build in stops for wildlife observation, swimming holes, lunch.',
  '["Quick-dry or synthetic clothing","Water shoes or sandals","Layers for morning or evening cold","Sunscreen and hat","Sunglasses with strap","Water and snacks","Small dry bag for phone","Cash for tip"]'::jsonb,
  '["Canoe or kayak","Paddle","Personal flotation device","Dry bags","Maps of the waterway","First aid kit"]'::jsonb,
  'Water & Weather Conditions',
  ARRAY['weather','wind','water_temp','water_flow'],
  'Write as a guide who paddled this stretch recently. Reference current conditions — water level, clarity, wind forecast. Note what wildlife has been active on the water this week. Describe one moment guests might experience that most people never see from land. 3-4 sentences.',
  '{"primary_cta":"Share your water photos","secondary_cta":"Book a different route or season","review_prompt":"Help others find this peaceful experience.","rebook_incentive":"Different seasons, completely different experience on the water."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Water Conditions","timeline":"The Route","what_to_expect":"What the Water Holds"}}'::jsonb,
  '{"may":"Water levels good. Wildlife active. Excellent all-around.","june":"Long days. Warm water coming. Wildlife with young.","july":"Peak summer. Warm water. Best for swimming stops.","august":"Late summer. Lower water on rivers. Excellent lakes.","september":"Foliage beginning. Cool mornings. Outstanding paddling.","october":"Peak foliage. Best reflection photography of year."}'::jsonb
);

-- Backcountry Skiing
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'backcountry_skiing', 'Backcountry Skiing & Splitboarding', '⛷️',
  'Write with the expertise and reverence of a backcountry guide who takes avalanche safety as seriously as finding powder. Tone is stoked but measured — the mountains demand respect. Reference actual snowpack, avalanche forecast, and temperature. Use backcountry language naturally: aspect, elevation band, skin track, transition, boot pack.',
  ARRAY['safety-first','stoked','measured','expert','reverent'],
  'Structure around avalanche safety windows and snow quality. Best snow: morning cold temps before sun softens surface. Dawn: meet, avalanche gear check, beacon check. Early morning: skin up. Mid-morning: summit/transition, ski down. Midday: assess for second objective or wrap.',
  '["Backcountry skis or splitboard with touring bindings","Skins","Avalanche beacon","Avalanche probe","Avalanche shovel","Helmet","Ski goggles","Warm waterproof layers","High-energy food and water","Sunscreen","Cash for tip"]'::jsonb,
  '["Avalanche airbag pack option","Repair kit","Group first aid","Emergency shelter","Navigation tools","Extra beacon batteries"]'::jsonb,
  'Snowpack & Avalanche Report',
  ARRAY['weather','avalanche_forecast','snow_depth','temperature','wind'],
  'Write this as a direct pre-trip safety and conditions briefing. Reference the current avalanche forecast level and what it means for today''s route. Note snowpack quality. One specific detail about today''s terrain and why it was chosen. Balance safety seriousness with genuine stoke. 4-5 sentences.',
  '{"primary_cta":"Share your powder photo","secondary_cta":"Book your next backcountry day","review_prompt":"Help other powder seekers find a qualified guide.","rebook_incentive":"Good snow does not last — get your next date on the calendar."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Snowpack & Avalanche Report","what_to_expect":"The Terrain & Conditions","notes_from_guide":"Pre-Trip Briefing"},"timeline_label":"The Objective"}'::jsonb,
  '{"november":"Early season. Variable snowpack. Objectives limited.","december":"Season building. First powder days. Instability possible.","january":"Prime season. Deep snowpack. Stable conditions typical.","february":"Peak season. Best all-around backcountry month.","march":"Spring conditions arriving. Corn snow in afternoon.","april":"Corn harvest season. Early starts critical."}'::jsonb
);

-- Photography
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'photography', 'Photography Tour & Workshop', '📷',
  'Write with the visual intelligence of a photographer who sees light before they see landscape. Tone is creative, instructional, and deeply observant. Reference golden hour, the specific light expected today, the compositions that work at this location and time of year.',
  ARRAY['visual','creative','observant','instructional','light-aware'],
  'Structure entirely around light. Blue hour and golden hour are the anchors. Sunrise: primary shooting locations chosen for morning light direction. Midday: if harsh light, focus on shade, water, intimate details, or post-processing workshop. Late afternoon: reposition for golden hour.',
  '["Your camera — any level from phone to professional","All lenses you own","Extra batteries","Extra memory cards","Tripod if you have one","Layers appropriate to location","Comfortable walking shoes","Cash for tip"]'::jsonb,
  '["Location scouting and composition guidance","Technical coaching for your specific equipment","Light reading and timing expertise","Post-processing guidance on request"]'::jsonb,
  'Light & Conditions Forecast',
  ARRAY['weather','sunrise_sunset','cloud_conditions','moon_phase'],
  'Write as a photographer who scouted this location recently. Reference what the light will be doing at the key moments today. Note one composition or subject that is particularly special right now. Get specific about what time the best light will happen. 4-5 sentences.',
  '{"primary_cta":"Share your best shot from today","secondary_cta":"Book another season for different light","review_prompt":"Help other photographers find an expert guide.","rebook_incentive":"Light is completely different each season."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Light & Weather Forecast","timeline":"Today''s Shooting Plan","what_to_bring":"Gear to Bring","notes_from_guide":"From Your Guide"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"january":"Blue hour. Snow and frost. Stark winter compositions.","february":"Winter light. Low angle sun. Long shadows all day.","march":"Waterfalls at peak. Mud and mist. Transitional beauty.","april":"Spring wildflowers. Soft light. Bloom season beginning.","may":"Vibrant greens. Wildflower peak. Long golden hours.","june":"Long days. Early sunrise. Wildlife with young.","july":"Dramatic afternoon storm clouds. Thunderstorm photography.","august":"Late summer warmth. Wildflowers at high elevation.","september":"Fall color beginning. Best overall photography month.","october":"Peak fall color. Incredible light. Best of the year.","november":"Early snowfall. Dramatic contrast. Bare trees and frost.","december":"Winter scenes. Holiday light. Snow and shadow."}'::jsonb
);

-- Stargazing
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'stargazing', 'Stargazing & Astronomy', '🌌',
  'Write with the profound wonder of someone who has spent thousands of hours under dark skies and still cannot believe what is up there. Tone is awe-inspiring, scientifically grounded but never clinical. Reference the specific objects, constellations, and events visible on this exact night.',
  ARRAY['wonder','scientific','profound','personal','inspiring'],
  'Structure around darkness and celestial timing. Arrival at dusk for naked-eye orientation as stars emerge. Dark adaptation period. Deep sky objects through telescope. Constellation stories and naked-eye tour. Allow for silence — some of the most powerful moments are simply looking up.',
  '["Warm layers — significantly colder than expected after dark","Hat, gloves, and extra jacket even in summer","Red flashlight if you have one","Reclining camp chair if available","Hot drink in a thermos","Camera with manual mode","Cash for tip"]'::jsonb,
  '["Telescope and optical equipment","Laser pointer for sky tours","Star charts and reference materials","Red lights for navigation","Seating if not provided by guest"]'::jsonb,
  'Tonight''s Sky Conditions',
  ARRAY['weather','moon_phase','astronomical_events','seeing_conditions'],
  'Write as an astronomer who has already checked tonight''s conditions. Reference the moon phase and what it means for visibility. Note the specific objects or events that will be highlights tonight. Describe one thing guests will see through the telescope that consistently stops people cold. 4-5 sentences.',
  '{"primary_cta":"Share your astrophotography","secondary_cta":"Book during a different moon phase","review_prompt":"Help others discover what the night sky really looks like.","rebook_incentive":"Every season and moon cycle offers something different."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Tonight''s Sky Report","timeline":"Tonight''s Program","what_to_bring":"What to Bring Into the Dark","notes_from_guide":"From Your Guide"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"january":"Excellent winter transparency. Orion and winter Milky Way.","february":"Winter constellations at peak. Cold but exceptional clarity.","march":"Transitional. Leo rising. Spring galaxies beginning.","april":"Galaxy season opening. Virgo cluster accessible.","may":"Milky Way core beginning to rise. Best galaxy season.","june":"Peak Milky Way core visibility. Summer triangle rising.","july":"Milky Way core at peak elevation. Perseid meteor shower approaching.","august":"Perseid meteor shower peak Aug 11-13. Prime Milky Way.","september":"Milky Way still excellent. Sagittarius region well-placed.","october":"Fall sky. Andromeda galaxy well-placed. Cooler and clearer.","november":"Leonid meteor shower. Winter constellations returning.","december":"Geminid meteor shower Dec 13-14. Best meteor shower of year."}'::jsonb
);

-- Mountain Biking
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'mountain_biking', 'Mountain Biking', '🚵',
  'Write with the infectious stoke of a rider who knows every trail in this system and gets as excited about a perfect berm as they did the first time they hit it. Tone is energetic, technical when appropriate, and always encouraging. Be honest about technical demands without being intimidating.',
  ARRAY['stoked','technical','energetic','encouraging','trail-knowledgeable'],
  'Structure around ride logistics and trail sequence. Trails build in difficulty through the day as riders warm up. Morning: easier warmup trail, skills check. Mid-morning: main objective trails. Afternoon: flow trails to finish on a high note.',
  '["Appropriate mountain bike","Helmet (full-face for technical riding)","Gloves","Knee and elbow pads recommended","Moisture-wicking athletic clothing","Hydration pack or water bottles","Energy food for the ride","Sunscreen","Cash for tip"]'::jsonb,
  '["Bike fitting and pre-ride safety check","Tube and basic repair kit","Pump","Expert trail knowledge and beta","Skills coaching as needed"]'::jsonb,
  'Trail Conditions',
  ARRAY['weather','trail_conditions','temperature'],
  'Write as a local rider who was on these trails recently. Reference current trail conditions — tacky is perfect, dust is manageable, wet is closed. Note which specific trails are in prime shape right now and why. Give one piece of riding advice or trail beta. 3-4 sentences.',
  '{"primary_cta":"Share your trail shots","secondary_cta":"Book another day of riding","review_prompt":"Help other riders find the best guide in the area.","rebook_incentive":"We have hundreds of miles of trail — ask what is next."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Trail Conditions Today","timeline":"Today''s Ride Plan","what_to_expect":"What You''re Getting Into"},"timeline_label":"The Ride"}'::jsonb,
  '{"march":"Shoulder season. Lower trails drying. Mud possible.","april":"Trails firming up. Wildflowers on flow trails.","may":"Prime spring riding. Perfect temps. Tacky dirt.","june":"Excellent conditions. High trails opening.","july":"Peak season. Ride early before heat.","august":"Same as July. Monsoon moisture helps in desert markets.","september":"Best riding month. Cool temps, tacky dirt, fall colors.","october":"Excellent fall riding. Colors peaking. Perfect temps.","november":"Late season. Getting cold. Last good weeks."}'::jsonb
);

-- Cultural History
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'cultural_history', 'Cultural & Historical Tour', '🏛️',
  'Write with the storytelling confidence of someone who has spent years obsessing over this place''s history and cannot wait to share what they have learned. Tone is engaging, narrative-driven, and full of specific detail — not a textbook recitation but a living story with characters, conflicts, and consequences.',
  ARRAY['narrative','historical','specific','engaging','storytelling'],
  'Structure as a narrative arc, not a checklist. The tour tells a story — beginning with establishing the place and period, building through key events, arriving at a meaningful conclusion connecting past to present. Stops should feel like chapters, not locations.',
  '["Comfortable walking shoes","Layers for outdoor sections","Camera or phone","Water","Curiosity and questions","Cash for tip"]'::jsonb,
  '["Expert historical and cultural commentary","Access to locations most visitors miss","Maps and reference materials"]'::jsonb,
  'Today in History',
  ARRAY['weather','local_events'],
  'Write as a historian who genuinely loves this place. Reference one specific historical detail about the neighborhood that most people walk right past. Connect the past to something guests will see on the tour. Make history feel immediate and alive. 3-4 sentences.',
  '{"primary_cta":"Share your tour photos","secondary_cta":"Book our other historic routes","review_prompt":"Help history lovers find an expert guide.","rebook_incentive":"We cover different periods and neighborhoods."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"What''s Happening in the Neighborhood","timeline":"The Route Through History","notes_from_guide":"A Note From Your Guide"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"april":"Spring — ideal walking weather. Outdoor sites at their best.","may":"Peak season begins. Events and markets add context.","june":"Long days. Maximum time at each site.","july":"Peak visitor season. Early morning tours beat the crowds.","september":"Shoulder season. Comfortable temperatures. Less crowded.","october":"Fall atmosphere adds to historic sites. Ghost tours popular.","december":"Holiday traditions and history. Festive atmosphere."}'::jsonb
);

-- 4WD / Jeep
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'four_wheel_drive', '4WD & Jeep Tour', '🚙',
  'Write with adventurous energy, deep local knowledge, and genuine enthusiasm for geology, mining history, and remote terrain. Tone is fun, knowledgeable, and slightly irreverent — like a local who has driven every road and cannot wait to share the stories most visitors never hear.',
  ARRAY['adventurous','historical','fun','knowledgeable','local'],
  'Structure around route and destination logic. Major destinations anchor the day with driving segments as transition and story time. Build in stops at viewpoints, historical sites, and geological features. Weather windows matter: mountain passes can close with afternoon storms.',
  '["Layers for temperature swings at elevation","Sunscreen and sunglasses","Camera or phone","Water and snacks","Motion sickness medication if sensitive","Cash for tip"]'::jsonb,
  '["4WD vehicle appropriate for the route","Recovery gear","First aid kit","Satellite communication","Expert commentary","Snacks and drinks on full day tours"]'::jsonb,
  'Road & Weather Conditions',
  ARRAY['weather','road_conditions','temperature'],
  'Write as a knowledgeable local who drove part of this route recently. Reference current road conditions, any notable seasonal features. Describe one specific story about a place on today''s route that guests will not forget. Build excitement for the remoteness and the views. 3-4 sentences.',
  '{"primary_cta":"Share your views from the top","secondary_cta":"Book a different route next time","review_prompt":"Help other adventurers find an expert local guide.","rebook_incentive":"We have routes for every season."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"timeline":"Today''s Route","conditions":"Road & Weather Report","what_to_bring":"What to Pack"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"may":"Roads beginning to open at elevation. Waterfalls at peak.","june":"Most high routes open. Wildflowers beginning.","july":"Peak season. All routes typically open. Afternoon storms possible.","august":"Excellent conditions. Wildflowers at high elevation.","september":"Fall colors beginning on aspen routes. Excellent photography.","october":"Peak fall color on lower routes. High passes closing."}'::jsonb
);

-- Ice Climbing
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'ice_climbing', 'Ice Climbing', '🧊',
  'Write with the technical confidence of a guide who lives for winter and has been swinging tools for years. Tone is focused, expert, and quietly badass — not reckless, but deeply comfortable in conditions that intimidate most people. Reference ice conditions directly: temperature, ice quality, whether it is in or out of condition.',
  ARRAY['focused','expert','winter-loving','technical','confident'],
  'Structure around ice conditions and daylight. Ice is best in cold stable temperatures. Morning: meet, gear up, safety briefing. Mid-morning through early afternoon: climbing on primary objective. Wrap before temperatures warm or light fades. Always debrief.',
  '["Warm synthetic or wool base layer (NO COTTON)","Insulating mid-layer","Warm waterproof outer layer","Warm waterproof gloves (bring two pairs)","Wool or synthetic hat and neck gaiter","Warm waterproof boots","Water and snacks","Hand warmers","Cash for tip"]'::jsonb,
  '["Ice climbing harness","Crampons fitted to your boots","Ice tools (axes)","Helmet","Belay devices","Ice screws and protection","Rope","First aid kit"]'::jsonb,
  'Ice Conditions Report',
  ARRAY['temperature','weather','wind','ice_conditions'],
  'Write as a guide who checked the ice yesterday or this morning. Reference actual temperature and ice quality. Let the guest know exactly what to expect — the cold, the commitment, and the reward. One specific detail about this particular route. Build anticipation for vertical ice. 3-4 sentences.',
  '{"primary_cta":"Share your ice photo","secondary_cta":"Book before the season ends","review_prompt":"Help other adventure seekers find this experience.","rebook_incentive":"Season is short — lock in another day before the ice goes out."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Ice Conditions Today","what_to_expect":"What You''re Getting Into"},"timeline_label":"The Day on Ice"}'::jsonb,
  '{"december":"Season beginning. Ice forming. Quality variable.","january":"Prime ice season. Cold stable temps = best conditions.","february":"Peak season in most markets. Best ice of the year.","march":"Season ending. Warming temps degrade ice. Book early dates."}'::jsonb
);

-- Via Ferrata
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'via_ferrata', 'Via Ferrata', '⛰️',
  'Write with the approachable confidence of a guide who has taken hundreds of people who thought they could not do this and watched every one of them reach the end grinning. Tone is encouraging, safety-focused, and genuinely excited about the views and the experience of moving through vertical terrain on fixed protection.',
  ARRAY['encouraging','safety-focused','excited','honest about exposure','rewarding'],
  'Structure around the route itself. Approach hike first. Gear up at the base. The route unfolds section by section. Summit or high point: time to breathe, take photos, absorb the accomplishment. Descent via alternate route typically.',
  '["Sturdy hiking boots with ankle support","Athletic clothing you can move freely in","Layers — it is colder on exposed rock faces","Sunscreen and sunglasses","Water and snacks","Camera","Cash for tip"]'::jsonb,
  '["Via ferrata harness fitted to you","Via ferrata lanyard and locking carabiners","Helmet","Gloves recommended","All technical protection","First aid kit"]'::jsonb,
  'Route & Weather Conditions',
  ARRAY['weather','temperature','wind','precipitation'],
  'Write as a guide who has run this route recently. Reference current conditions — wet rock changes the experience significantly. Note what the exposure feels like on the key sections and reassure about fixed protection. Describe the view from the highest point. 3-4 sentences.',
  '{"primary_cta":"Share your via ferrata photos","secondary_cta":"Book a harder route next time","review_prompt":"Help other adventurers find the confidence to try this.","rebook_incentive":"Ready to step it up? Ask about our more technical routes."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_expect","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Route Conditions","what_to_expect":"What the Route Demands","timeline":"The Route"},"timeline_label":"The Route"}'::jsonb,
  '{"june":"Season opening. Conditions variable. Some ice possible early.","july":"Prime season. Rock dry and warm. Best all-around.","august":"Excellent conditions. Watch afternoon thunderstorms.","september":"Excellent fall conditions. Less crowded. Cooler temps.","october":"Late season. Cold mornings. Ice possible. Check conditions."}'::jsonb
);

-- Foraging
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'foraging', 'Wild Food & Foraging Tour', '🍄',
  'Write with the grounded enthusiasm of someone who has been reading landscapes for food since they were a kid and finds genuine magic in what grows wild and free. Tone is earthy, educational, and quietly radical — sharing a way of seeing the world that changes how guests look at every walk afterward.',
  ARRAY['earthy','educational','wonder','ancient-knowledge','sensory'],
  'Structure around the seasonal rhythm of what is available. Move through terrain types that offer different species. Teach identification before tasting. Build the day around discovery — foraging cannot be rushed. End with a tasting or preparation if possible.',
  '["Comfortable walking shoes or boots","Layers for variable conditions","Small basket or bag for carrying finds","Camera for documentation","Water and light snacks","Open curiosity","Cash for tip"]'::jsonb,
  '["Identification guides and reference materials","Foraging baskets or bags","Preparation tools if applicable","Expert species identification","First aid kit"]'::jsonb,
  'What''s Fruiting & Available',
  ARRAY['weather','temperature','seasonal_plants'],
  'Write as a forager who was out in this terrain recently. Reference specifically what is fruiting or available right now and where. Name one species that is in prime condition this week. Build genuine excitement for the discovery aspect. 3-4 sentences.',
  '{"primary_cta":"Share your finds","secondary_cta":"Book a different season — completely different species","review_prompt":"Help others discover this ancient skill.","rebook_incentive":"Every season offers something completely different."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"What''s Available Right Now","timeline":"The Foraging Route"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"march":"Ramps emerging in eastern markets. Watercress.","april":"Ramp peak. Fiddlehead ferns. Morel mushrooms beginning.","may":"Morel peak. Wild strawberries beginning. Nettles.","june":"Elderflower. Wild berries beginning. Wood sorrel.","july":"Wild blueberries and huckleberries. Chanterelles beginning.","august":"Chanterelle peak. Wild raspberries. Blackberries.","september":"King bolete mushrooms. Late berries. Autumn olives.","october":"Hen of the woods peak. Late mushrooms. Nuts and seeds.","november":"Oyster mushrooms on dead wood. Late season finds."}'::jsonb
);

-- Snowmobiling
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'snowmobiling', 'Snowmobile Tour', '🏔️',
  'Write with the energy of a mountain local who has been riding these trails since they could reach the throttle. Tone is fun, safety-conscious, and full of genuine enthusiasm for moving through a winter landscape most people only see from the road.',
  ARRAY['fun','adventurous','winter-loving','safety-aware','access-focused'],
  'Structure around route and destinations. Meet at base, safety briefing and sled orientation. Warm up on groomed trail. Build to more interesting terrain. Major destination or viewpoint mid-route. Return.',
  '["Very warm waterproof layers","Warm waterproof gloves","Neck gaiter and warm hat","Warm waterproof boots","Goggles or sunglasses","Valid ID","Cash for tip"]'::jsonb,
  '["Snowmobile fitted to your size","Helmet","Fuel","Safety and recovery equipment","Guide expertise on trail system"]'::jsonb,
  'Trail & Snow Conditions',
  ARRAY['weather','temperature','snow_depth','trail_conditions'],
  'Write as a local who rode this trail system recently. Reference current snow conditions — depth, grooming status, powder versus packed. Note the highlight destination or view on today''s route. Give one safety or riding tip. 3-4 sentences.',
  '{"primary_cta":"Share your snowmobile photos","secondary_cta":"Book before the season ends","review_prompt":"Help other winter adventurers find this experience.","rebook_incentive":"Different snow conditions create completely different experiences."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"Trail & Snow Report","timeline":"Today''s Route","what_to_bring":"What to Wear"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"december":"Season opening. Early snow. Variable conditions.","january":"Prime season. Deep snow. Best conditions.","february":"Peak season. Maximum snowpack.","march":"Late season. Spring snow. Warm afternoons possible.","april":"High elevation riding only. Season closing."}'::jsonb
);

-- Brewery Tour
INSERT INTO vertical_configs (vertical, display_name, icon, prompt_personality, tone_keywords, timeline_logic, what_to_bring_defaults, what_to_bring_guide_provides, conditions_block_label, conditions_data_types, notes_from_guide_prompt, after_experience_config, section_overrides, seasonal_intelligence) VALUES (
  'brewery_tour', 'Craft Brewery & Beverage Tour', '🍺',
  'Write with the knowledgeable enthusiasm of someone who genuinely loves the craft and the culture behind what is being made. Tone is convivial, educational, and celebratory without being sloppy — this is about understanding and appreciating, not just consuming.',
  ARRAY['convivial','educational','celebratory','insider','craft-focused'],
  'Structure around pacing and palate. Do not start with the heaviest offerings — build through the day. Lighter styles early. More complex and robust offerings mid-tour. Something special at the end. Build in water and food between stops. Transport between stops is a must.',
  '["Comfortable walking or standing shoes","Layers for indoor/outdoor changes","An open palate and genuine curiosity","Valid ID","Cash for additional purchases","Cash for tip"]'::jsonb,
  '["Transport between all stops","Expert brewery and craft commentary","Tasting coordination at each stop","Behind-the-scenes access where available","Water and snacks between stops"]'::jsonb,
  'What''s Pouring Right Now',
  ARRAY['weather','local_events'],
  'Write as a guide who was at these taprooms recently and knows exactly what is on tap. Reference one seasonal or limited release pouring right now and why it is worth tasting. Note the personality behind one stop that guests will find memorable. 3-4 sentences.',
  '{"primary_cta":"Share your favorites from today","secondary_cta":"Book our seasonal tour","review_prompt":"Help craft beer lovers find the best tour in town.","rebook_incentive":"Seasonal releases change everything — come back for our harvest, winter, and spring tours."}'::jsonb,
  '{"show_sections":["header","overview","timeline","conditions","what_to_bring","notes_from_guide","after_experience"],"rename":{"conditions":"What''s Pouring This Week","timeline":"Today''s Tour","what_to_bring":"What to Know Before You Go"},"hide_sections":["what_to_expect"]}'::jsonb,
  '{"january":"Stouts, porters, and winter warmers. Barrel-aged releases.","february":"Valentine releases. Dark and rich styles.","march":"Irish-inspired releases. Spring lagers beginning.","april":"Spring seasonals. Saisons and farmhouse ales.","may":"Lighter summer styles arriving. Pale ales and IPAs.","june":"Crushable summer beers. Outdoor taprooms opening.","july":"Peak summer. Patio drinking. Hazy IPAs and sours.","august":"Late summer. Harvest preparations beginning.","september":"Oktoberfest and harvest releases. Marzen and amber ales.","october":"Peak fall seasonals. Pumpkin and spiced releases.","november":"Thanksgiving releases. Dark and malty styles.","december":"Holiday releases. Barrel-aged stouts. Festive flavors."}'::jsonb
);
