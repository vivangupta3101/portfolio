// Annotation layer over the hero process reel. The reel is ten 2-second shots cut apart by black
// frames; this reads the video's own clock and works over whatever is on screen in that shot.
// Not every shot is labelled: some get a bracket and a callout, others only a halftone screen, a
// pixel block or a crosshair, so the layer keeps a rhythm instead of tagging everything.
//
// GEOMETRY. A device's position is one of three shapes — a rect `{u,v,w,h}`, a bare point `{u,v}`,
// or a polygon `{pts:[{u,v},…]}` — in fractions of the video frame, so it survives any crop. Any of
// them can instead be a *track*: `{keys:[{t, …shape}]}`, interpolated against the video clock, which
// is how a mask follows a moving object. Keyframes are authored with the dev mask editor
// (js/hero-mask-dev.js, press M) and pasted back into SHOTS here.
//
// The frame chrome (corners, tick rail, readouts) is white under mix-blend-mode: difference, the
// same trick the cursor and scrollbar use — so `layer` must NOT create a stacking context (no
// z-index, no opacity on it), or the blend would isolate itself from the video underneath.
(function () {
  var video = document.querySelector('#top video');
  if (!video) return;
  var box = video.parentElement;
  var lite = document.documentElement.classList.contains('vg-lite');
  var ACCENT = '#ec7e41';
  var SOFT = 'rgba(236,126,65,0.78)';
  var HAIR = 'rgba(255,255,255,0.5)';
  var SHADOW = '0 1px 2px rgba(0,0,0,0.85), 0 2px 14px rgba(0,0,0,0.6)';
  var EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  var FLOOD = 'cubic-bezier(0.45, 0, 0.35, 1)';
  var MONO = "font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;" +
    'font-weight:400;letter-spacing:0.1em;text-transform:uppercase;line-height:1.5';

  // t0/t1 are measured off the cut points in the file.
  var SHOTS = [
    {t0:0.4,t1:2.3,cap:'DEFINING GEOMETRY',half:{u:0.06,v:0.56,w:0.24,h:0.26},pix:{u:0.72,v:0.72}},
    {t0:3.2,t1:5.1,cap:'COMMITTING THE FILE',label:'LETS START',mark:{keys:[{pts:[{u:0.377,v:0.329},{u:0.624,v:0.506},{u:0.521,v:0.641},{u:0.281,v:0.454}],t:3.2},{pts:[{u:0.375,v:0.334},{u:0.622,v:0.511},{u:0.519,v:0.646},{u:0.279,v:0.459}],t:3.28},{pts:[{u:0.375,v:0.334},{u:0.622,v:0.511},{u:0.519,v:0.646},{u:0.279,v:0.459}],t:3.37},{pts:[{u:0.377,v:0.33},{u:0.624,v:0.508},{u:0.517,v:0.647},{u:0.276,v:0.462}],t:3.45},{pts:[{u:0.377,v:0.33},{u:0.626,v:0.513},{u:0.517,v:0.647},{u:0.276,v:0.462}],t:3.53},{pts:[{u:0.376,v:0.328},{u:0.626,v:0.516},{u:0.517,v:0.65},{u:0.276,v:0.465}],t:3.62},{pts:[{u:0.376,v:0.328},{u:0.626,v:0.516},{u:0.52,v:0.656},{u:0.272,v:0.466}],t:3.7},{pts:[{u:0.37,v:0.329},{u:0.626,v:0.516},{u:0.52,v:0.656},{u:0.265,v:0.469}],t:3.78},{pts:[{u:0.37,v:0.329},{u:0.625,v:0.523},{u:0.522,v:0.661},{u:0.262,v:0.474}],t:3.87},{pts:[{u:0.365,v:0.33},{u:0.625,v:0.523},{u:0.522,v:0.661},{u:0.261,v:0.476}],t:3.95},{pts:[{u:0.363,v:0.333},{u:0.624,v:0.526},{u:0.521,v:0.663},{u:0.26,v:0.478}],t:4.03},{pts:[{u:0.359,v:0.335},{u:0.62,v:0.528},{u:0.517,v:0.665},{u:0.256,v:0.48}],t:4.12},{pts:[{u:0.359,v:0.335},{u:0.623,v:0.533},{u:0.517,v:0.665},{u:0.255,v:0.48}],t:4.2},{pts:[{u:0.359,v:0.335},{u:0.627,v:0.535},{u:0.515,v:0.681},{u:0.252,v:0.481}],t:4.28},{pts:[{u:0.352,v:0.335},{u:0.63,v:0.549},{u:0.514,v:0.683},{u:0.245,v:0.481}],t:4.37},{pts:[{u:0.352,v:0.335},{u:0.625,v:0.542},{u:0.514,v:0.683},{u:0.24,v:0.483}],t:4.45},{pts:[{u:0.351,v:0.334},{u:0.629,v:0.541},{u:0.514,v:0.691},{u:0.236,v:0.486}],t:4.53},{pts:[{u:0.347,v:0.331},{u:0.63,v:0.544},{u:0.518,v:0.694},{u:0.232,v:0.483}],t:4.62},{pts:[{u:0.345,v:0.33},{u:0.635,v:0.55},{u:0.516,v:0.693},{u:0.23,v:0.482}],t:4.7},{pts:[{u:0.342,v:0.323},{u:0.639,v:0.539},{u:0.521,v:0.707},{u:0.219,v:0.472}],t:4.78},{pts:[{u:0.337,v:0.313},{u:0.637,v:0.541},{u:0.52,v:0.718},{u:0.203,v:0.483}],t:4.87},{pts:[{u:0.334,v:0.304},{u:0.658,v:0.548},{u:0.518,v:0.731},{u:0.193,v:0.476}],t:4.95},{pts:[{u:0.314,v:0.309},{u:0.658,v:0.548},{u:0.516,v:0.742},{u:0.171,v:0.493}],t:5.03},{pts:[{u:0.314,v:0.309},{u:0.658,v:0.548},{u:0.516,v:0.742},{u:0.171,v:0.493}],t:5.09}]},at:{u:0.664,v:0.786},cross:{u:0.7,v:0.72}},
    {t0:6,t1:7.9,cap:'VERIFYING TOLERANCE',label:'PROTOTYPING',mark:{keys:[{pts:[{u:0.641,v:0.116},{u:0.831,v:0.187},{u:0.812,v:0.313},{u:0.625,v:0.239}],t:6},{pts:[{u:0.639,v:0.111},{u:0.831,v:0.183},{u:0.812,v:0.31},{u:0.623,v:0.235}],t:6.08},{pts:[{u:0.638,v:0.103},{u:0.831,v:0.183},{u:0.812,v:0.307},{u:0.621,v:0.235}],t:6.17},{pts:[{u:0.638,v:0.103},{u:0.831,v:0.183},{u:0.812,v:0.307},{u:0.621,v:0.235}],t:6.25},{pts:[{u:0.638,v:0.103},{u:0.831,v:0.183},{u:0.812,v:0.307},{u:0.621,v:0.235}],t:6.33},{pts:[{u:0.636,v:0.109},{u:0.831,v:0.183},{u:0.809,v:0.313},{u:0.619,v:0.237}],t:6.42},{pts:[{u:0.635,v:0.109},{u:0.831,v:0.183},{u:0.81,v:0.313},{u:0.618,v:0.237}],t:6.5},{pts:[{u:0.632,v:0.109},{u:0.83,v:0.183},{u:0.81,v:0.313},{u:0.616,v:0.237}],t:6.58},{pts:[{u:0.63,v:0.108},{u:0.828,v:0.182},{u:0.808,v:0.313},{u:0.613,v:0.237}],t:6.67},{pts:[{u:0.629,v:0.108},{u:0.826,v:0.182},{u:0.807,v:0.313},{u:0.612,v:0.237}],t:6.75},{pts:[{u:0.629,v:0.108},{u:0.826,v:0.182},{u:0.807,v:0.313},{u:0.612,v:0.237}],t:6.83},{pts:[{u:0.631,v:0.097},{u:0.829,v:0.171},{u:0.809,v:0.301},{u:0.614,v:0.226}],t:6.92},{pts:[{u:0.63,v:0.096},{u:0.828,v:0.17},{u:0.808,v:0.3},{u:0.613,v:0.225}],t:7},{pts:[{u:0.627,v:0.092},{u:0.827,v:0.165},{u:0.807,v:0.296},{u:0.61,v:0.221}],t:7.08},{pts:[{u:0.628,v:0.085},{u:0.828,v:0.159},{u:0.808,v:0.29},{u:0.611,v:0.214}],t:7.17},{pts:[{u:0.626,v:0.082},{u:0.827,v:0.155},{u:0.812,v:0.286},{u:0.61,v:0.211}],t:7.25},{pts:[{u:0.624,v:0.079},{u:0.828,v:0.154},{u:0.811,v:0.283},{u:0.608,v:0.208}],t:7.33},{pts:[{u:0.627,v:0.075},{u:0.833,v:0.15},{u:0.815,v:0.278},{u:0.611,v:0.203}],t:7.42},{pts:[{u:0.629,v:0.071},{u:0.835,v:0.146},{u:0.817,v:0.275},{u:0.612,v:0.199}],t:7.5},{pts:[{u:0.63,v:0.067},{u:0.836,v:0.136},{u:0.818,v:0.27},{u:0.613,v:0.194}],t:7.58},{pts:[{u:0.632,v:0.061},{u:0.838,v:0.13},{u:0.82,v:0.265},{u:0.614,v:0.189}],t:7.67},{pts:[{u:0.632,v:0.059},{u:0.838,v:0.128},{u:0.82,v:0.262},{u:0.614,v:0.186}],t:7.75},{pts:[{u:0.632,v:0.059},{u:0.838,v:0.128},{u:0.82,v:0.262},{u:0.614,v:0.186}],t:7.83}]},at:{u:0.812,v:0.665},pix:{u:0.55,v:0.8}},
    {t0:8.8,t1:10.7,cap:'THINKING BY HAND',label:'PEN TO PAPER',mark:{keys:[{pts:[{u:0.546,v:0.771},{u:0.261,v:1.007},{u:0.164,v:0.866},{u:0.428,v:0.629}],t:8.8},{pts:[{u:0.542,v:0.773},{u:0.257,v:1.009},{u:0.161,v:0.867},{u:0.424,v:0.631}],t:8.88},{pts:[{u:0.538,v:0.778},{u:0.254,v:1.014},{u:0.162,v:0.871},{u:0.419,v:0.632}],t:8.97},{pts:[{u:0.536,v:0.779},{u:0.251,v:1.015},{u:0.159,v:0.872},{u:0.416,v:0.633}],t:9.05},{pts:[{u:0.534,v:0.781},{u:0.249,v:1.017},{u:0.157,v:0.874},{u:0.415,v:0.635}],t:9.13},{pts:[{u:0.534,v:0.781},{u:0.249,v:1.017},{u:0.157,v:0.874},{u:0.415,v:0.635}],t:9.22},{pts:[{u:0.539,v:0.788},{u:0.249,v:1.025},{u:0.157,v:0.882},{u:0.415,v:0.639}],t:9.3},{pts:[{u:0.538,v:0.793},{u:0.248,v:1.03},{u:0.156,v:0.887},{u:0.414,v:0.644}],t:9.38},{pts:[{u:0.538,v:0.793},{u:0.248,v:1.03},{u:0.156,v:0.887},{u:0.414,v:0.644}],t:9.47},{pts:[{u:0.531,v:0.792},{u:0.241,v:1.029},{u:0.148,v:0.883},{u:0.407,v:0.643}],t:9.55},{pts:[{u:0.525,v:0.795},{u:0.236,v:1.032},{u:0.145,v:0.881},{u:0.402,v:0.647}],t:9.63},{pts:[{u:0.527,v:0.798},{u:0.237,v:1.034},{u:0.147,v:0.883},{u:0.405,v:0.645}],t:9.72},{pts:[{u:0.523,v:0.803},{u:0.233,v:1.04},{u:0.143,v:0.889},{u:0.4,v:0.651}],t:9.8},{pts:[{u:0.521,v:0.804},{u:0.231,v:1.041},{u:0.141,v:0.89},{u:0.399,v:0.652}],t:9.88},{pts:[{u:0.519,v:0.809},{u:0.229,v:1.046},{u:0.139,v:0.895},{u:0.397,v:0.657}],t:9.97},{pts:[{u:0.526,v:0.811},{u:0.23,v:1.054},{u:0.14,v:0.903},{u:0.406,v:0.65}],t:10.05},{pts:[{u:0.524,v:0.813},{u:0.228,v:1.056},{u:0.138,v:0.905},{u:0.404,v:0.652}],t:10.13},{pts:[{u:0.523,v:0.814},{u:0.227,v:1.057},{u:0.137,v:0.906},{u:0.403,v:0.653}],t:10.22},{pts:[{u:0.523,v:0.814},{u:0.227,v:1.057},{u:0.137,v:0.906},{u:0.403,v:0.653}],t:10.3},{pts:[{u:0.519,v:0.816},{u:0.223,v:1.059},{u:0.133,v:0.908},{u:0.399,v:0.656}],t:10.38},{pts:[{u:0.516,v:0.818},{u:0.219,v:1.061},{u:0.129,v:0.91},{u:0.396,v:0.657}],t:10.47},{pts:[{u:0.515,v:0.826},{u:0.218,v:1.07},{u:0.128,v:0.919},{u:0.394,v:0.666}],t:10.55},{pts:[{u:0.512,v:0.826},{u:0.216,v:1.069},{u:0.126,v:0.918},{u:0.392,v:0.666}],t:10.63},{pts:[{u:0.511,v:0.827},{u:0.215,v:1.07},{u:0.125,v:0.919},{u:0.391,v:0.667}],t:10.69}]},at:{u:0.628,v:0.627}},
    {t0:11.6,t1:13.9,cap:'BRINGING IT ONLINE',half:{u:0.03,v:0.2,w:0.26,h:0.46},cross:{u:0.74,v:0.5}},
    {t0:14.4,t1:16.3,cap:'REMOVING MATERIAL',pix:{u:0.16,v:0.74}},
    {t0:17.2,t1:19.1,cap:'COLLABORATING',label:'BRAINSTORMING',mark:{keys:[{pts:[{u:0.377,v:0.526},{u:0.611,v:0.532},{u:0.611,v:0.763},{u:0.374,v:0.759}],t:17.45},{pts:[{u:0.377,v:0.526},{u:0.611,v:0.532},{u:0.611,v:0.763},{u:0.374,v:0.759}],t:17.53},{pts:[{u:0.378,v:0.528},{u:0.611,v:0.534},{u:0.611,v:0.765},{u:0.374,v:0.761}],t:17.62},{pts:[{u:0.378,v:0.528},{u:0.611,v:0.534},{u:0.611,v:0.765},{u:0.374,v:0.761}],t:17.7},{pts:[{u:0.376,v:0.528},{u:0.614,v:0.534},{u:0.614,v:0.764},{u:0.372,v:0.761}],t:17.78},{pts:[{u:0.375,v:0.529},{u:0.615,v:0.533},{u:0.617,v:0.768},{u:0.371,v:0.762}],t:17.87},{pts:[{u:0.374,v:0.531},{u:0.614,v:0.535},{u:0.616,v:0.771},{u:0.371,v:0.764}],t:17.95},{pts:[{u:0.374,v:0.531},{u:0.614,v:0.535},{u:0.616,v:0.771},{u:0.371,v:0.764}],t:18.03},{pts:[{u:0.373,v:0.534},{u:0.615,v:0.537},{u:0.615,v:0.774},{u:0.369,v:0.768}],t:18.12},{pts:[{u:0.371,v:0.532},{u:0.616,v:0.532},{u:0.615,v:0.779},{u:0.369,v:0.773}],t:18.2},{pts:[{u:0.37,v:0.532},{u:0.616,v:0.533},{u:0.615,v:0.779},{u:0.368,v:0.773}],t:18.28},{pts:[{u:0.368,v:0.533},{u:0.617,v:0.536},{u:0.618,v:0.78},{u:0.366,v:0.774}],t:18.37},{pts:[{u:0.37,v:0.532},{u:0.617,v:0.536},{u:0.618,v:0.78},{u:0.366,v:0.774}],t:18.45},{pts:[{u:0.369,v:0.533},{u:0.618,v:0.537},{u:0.617,v:0.78},{u:0.365,v:0.774}],t:18.53},{pts:[{u:0.368,v:0.536},{u:0.618,v:0.54},{u:0.616,v:0.783},{u:0.364,v:0.777}],t:18.62},{pts:[{u:0.368,v:0.538},{u:0.62,v:0.537},{u:0.619,v:0.784},{u:0.364,v:0.779}],t:18.7},{pts:[{u:0.366,v:0.532},{u:0.62,v:0.537},{u:0.619,v:0.784},{u:0.364,v:0.779}],t:18.78},{pts:[{u:0.365,v:0.534},{u:0.62,v:0.539},{u:0.62,v:0.786},{u:0.363,v:0.781}],t:18.87},{pts:[{u:0.364,v:0.533},{u:0.622,v:0.541},{u:0.623,v:0.789},{u:0.362,v:0.783}],t:18.95},{pts:[{u:0.362,v:0.532},{u:0.622,v:0.535},{u:0.623,v:0.79},{u:0.361,v:0.782}],t:19.03},{pts:[{u:0.364,v:0.532},{u:0.624,v:0.535},{u:0.625,v:0.79},{u:0.362,v:0.782}],t:19.09}]},at:{u:0.55,v:0.832}},
    {t0:20,t1:22.3,cap:'BUILDING IN LAYERS',label:'3D MODELLING',mark:{keys:[{u:0.137,v:0.566,w:0.822,h:0.092,t:20},{u:0.138,v:0.578,w:0.822,h:0.092,t:20.08},{u:0.146,v:0.571,w:0.822,h:0.092,t:20.17},{u:0.147,v:0.563,w:0.822,h:0.092,t:20.25},{u:0.147,v:0.572,w:0.822,h:0.092,t:20.33},{u:0.146,v:0.578,w:0.822,h:0.092,t:20.42},{u:0.146,v:0.578,w:0.822,h:0.092,t:21.33},{u:0.148,v:0.583,w:0.822,h:0.092,t:21.42},{u:0.148,v:0.583,w:0.822,h:0.092,t:22.17}]},at:{u:0.843,v:0.703},half:{u:0.06,v:0.66,w:0.3,h:0.22},pix:{u:0.7,v:0.3}},
    {t0:23.1,t1:25.1,cap:'SEPARATING PARTS',label:'KERF',mark:{keys:[{pts:[{u:0.432,v:0.502},{u:0.601,v:0.503},{u:0.535,v:0.724},{u:0.498,v:0.728}],t:23.1},{pts:[{u:0.439,v:0.503},{u:0.608,v:0.504},{u:0.542,v:0.725},{u:0.506,v:0.729}],t:23.18},{pts:[{u:0.453,v:0.502},{u:0.624,v:0.502},{u:0.556,v:0.724},{u:0.519,v:0.728}],t:23.27},{pts:[{u:0.461,v:0.501},{u:0.635,v:0.501},{u:0.568,v:0.725},{u:0.527,v:0.727}],t:23.35},{pts:[{u:0.479,v:0.505},{u:0.652,v:0.501},{u:0.586,v:0.729},{u:0.545,v:0.731}],t:23.43},{pts:[{u:0.489,v:0.505},{u:0.664,v:0.502},{u:0.596,v:0.729},{u:0.555,v:0.731}],t:23.52},{pts:[{u:0.508,v:0.505},{u:0.682,v:0.502},{u:0.615,v:0.729},{u:0.574,v:0.731}],t:23.6},{pts:[{u:0.518,v:0.507},{u:0.692,v:0.503},{u:0.625,v:0.731},{u:0.584,v:0.733}],t:23.68},{pts:[{u:0.533,v:0.504},{u:0.707,v:0.5},{u:0.64,v:0.728},{u:0.599,v:0.73}],t:23.77},{pts:[{u:0.542,v:0.503},{u:0.716,v:0.5},{u:0.648,v:0.727},{u:0.608,v:0.729}],t:23.85},{pts:[{u:0.551,v:0.501},{u:0.726,v:0.497},{u:0.658,v:0.725},{u:0.618,v:0.727}],t:23.93},{pts:[{u:0.557,v:0.5},{u:0.731,v:0.496},{u:0.664,v:0.724},{u:0.623,v:0.726}],t:24.02},{pts:[{u:0.566,v:0.493},{u:0.74,v:0.49},{u:0.672,v:0.714},{u:0.634,v:0.715}],t:24.1},{pts:[{u:0.569,v:0.468},{u:0.747,v:0.469},{u:0.678,v:0.704},{u:0.64,v:0.705}],t:24.18},{pts:[{u:0.576,v:0.458},{u:0.754,v:0.459},{u:0.685,v:0.694},{u:0.647,v:0.695}],t:24.27},{pts:[{u:0.586,v:0.448},{u:0.763,v:0.449},{u:0.694,v:0.684},{u:0.657,v:0.685}],t:24.35},{pts:[{u:0.591,v:0.429},{u:0.774,v:0.431},{u:0.706,v:0.669},{u:0.664,v:0.67}],t:24.43},{pts:[{u:0.597,v:0.422},{u:0.78,v:0.424},{u:0.712,v:0.662},{u:0.67,v:0.663}],t:24.52},{pts:[{u:0.605,v:0.41},{u:0.79,v:0.411},{u:0.721,v:0.654},{u:0.679,v:0.655}],t:24.6},{pts:[{u:0.612,v:0.405},{u:0.797,v:0.406},{u:0.724,v:0.65},{u:0.686,v:0.65}],t:24.68},{pts:[{u:0.624,v:0.394},{u:0.809,v:0.395},{u:0.736,v:0.639},{u:0.697,v:0.639}],t:24.77},{pts:[{u:0.628,v:0.391},{u:0.813,v:0.392},{u:0.74,v:0.636},{u:0.701,v:0.636}],t:24.85},{pts:[{u:0.628,v:0.391},{u:0.813,v:0.392},{u:0.74,v:0.636},{u:0.701,v:0.636}],t:24.93}]},at:{u:0.872,v:0.292}},
    {t0:25.9,t1:27.9,cap:'PROVING THE CIRCUIT',label:'CONTINUITY',mark:{keys:[{pts:[{u:0.378,v:0.638},{u:0.417,v:0.625},{u:0.504,v:0.867},{u:0.462,v:0.889}],t:25.9},{pts:[{u:0.374,v:0.642},{u:0.413,v:0.629},{u:0.5,v:0.871},{u:0.458,v:0.894}],t:25.98},{pts:[{u:0.372,v:0.644},{u:0.411,v:0.632},{u:0.498,v:0.874},{u:0.456,v:0.896}],t:26.07},{pts:[{u:0.368,v:0.646},{u:0.407,v:0.633},{u:0.493,v:0.875},{u:0.452,v:0.898}],t:26.15},{pts:[{u:0.368,v:0.648},{u:0.406,v:0.635},{u:0.493,v:0.877},{u:0.451,v:0.899}],t:26.23},{pts:[{u:0.364,v:0.65},{u:0.402,v:0.637},{u:0.489,v:0.88},{u:0.447,v:0.902}],t:26.32},{pts:[{u:0.36,v:0.651},{u:0.398,v:0.638},{u:0.485,v:0.88},{u:0.443,v:0.903}],t:26.4},{pts:[{u:0.359,v:0.653},{u:0.397,v:0.64},{u:0.484,v:0.882},{u:0.442,v:0.904}],t:26.48},{pts:[{u:0.354,v:0.649},{u:0.395,v:0.639},{u:0.482,v:0.882},{u:0.44,v:0.904}],t:26.57},{pts:[{u:0.352,v:0.651},{u:0.393,v:0.642},{u:0.48,v:0.884},{u:0.438,v:0.906}],t:26.65},{pts:[{u:0.349,v:0.65},{u:0.389,v:0.64},{u:0.476,v:0.882},{u:0.434,v:0.904}],t:26.73},{pts:[{u:0.347,v:0.653},{u:0.387,v:0.643},{u:0.477,v:0.892},{u:0.436,v:0.913}],t:26.82},{pts:[{u:0.347,v:0.652},{u:0.387,v:0.643},{u:0.477,v:0.892},{u:0.436,v:0.913}],t:26.9},{pts:[{u:0.345,v:0.656},{u:0.386,v:0.647},{u:0.476,v:0.896},{u:0.435,v:0.917}],t:26.98},{pts:[{u:0.346,v:0.651},{u:0.386,v:0.647},{u:0.478,v:0.899},{u:0.435,v:0.921}],t:27.07},{pts:[{u:0.344,v:0.652},{u:0.384,v:0.648},{u:0.476,v:0.9},{u:0.433,v:0.922}],t:27.15},{pts:[{u:0.344,v:0.655},{u:0.384,v:0.651},{u:0.478,v:0.907},{u:0.434,v:0.931}],t:27.23},{pts:[{u:0.344,v:0.655},{u:0.384,v:0.651},{u:0.481,v:0.913},{u:0.433,v:0.936}],t:27.32},{pts:[{u:0.341,v:0.657},{u:0.381,v:0.652},{u:0.479,v:0.915},{u:0.43,v:0.937}],t:27.4},{pts:[{u:0.338,v:0.66},{u:0.378,v:0.655},{u:0.476,v:0.918},{u:0.427,v:0.94}],t:27.48},{pts:[{u:0.337,v:0.661},{u:0.378,v:0.656},{u:0.475,v:0.919},{u:0.426,v:0.941}],t:27.57},{pts:[{u:0.336,v:0.663},{u:0.377,v:0.658},{u:0.474,v:0.921},{u:0.425,v:0.943}],t:27.65},{pts:[{u:0.336,v:0.667},{u:0.376,v:0.663},{u:0.473,v:0.925},{u:0.425,v:0.948}],t:27.73},{pts:[{u:0.336,v:0.667},{u:0.376,v:0.663},{u:0.473,v:0.925},{u:0.425,v:0.948}],t:27.82}]},at:{u:0.228,v:0.681},pix:{u:0.78,v:0.72}}
  ];

  // ---- track sampling: static rect or interpolated keyframes ----
  function sample(track, t) {
    if (!track) return null;
    var k = track.keys;
    if (!k || !k.length) return track;
    if (k.length === 1 || t <= k[0].t) return k[0];
    if (t >= k[k.length - 1].t) return k[k.length - 1];
    for (var i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        var a = k[i - 1], b = k[i];
        var f = (t - a.t) / Math.max(0.0001, b.t - a.t);
        if (a.pts && b.pts && a.pts.length === b.pts.length) {
          return { pts: a.pts.map(function (p, n) {
            return { u: p.u + (b.pts[n].u - p.u) * f, v: p.v + (b.pts[n].v - p.v) * f };
          }) };
        }
        if (a.pts) return a;
        return { u: a.u + (b.u - a.u) * f, v: a.v + (b.v - a.v) * f,
          w: a.w == null ? a.w : a.w + (b.w - a.w) * f,
          h: a.h == null ? a.h : a.h + (b.h - a.h) * f };
      }
    }
    return k[k.length - 1];
  }

  var style = document.createElement('style');
  style.textContent =
    '@keyframes vgHvFlash{0%{opacity:0}18%{opacity:1}34%{opacity:0.25}52%{opacity:1}100%{opacity:1}}' +
    '@keyframes vgHvScan{0%{transform:translateX(0);opacity:0}10%{opacity:0.3}90%{opacity:0.3}100%{transform:translateX(100%);opacity:0}}' +
    '@keyframes vgHvCell{0%{opacity:0;transform:scale(0.2)}100%{opacity:1;transform:scale(1)}}';
  document.head.appendChild(style);

  var layer = document.createElement('div');
  layer.id = 'vg-hero-ov';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden';
  video.insertAdjacentElement('afterend', layer);

  function el(css, parent) {
    var d = document.createElement('div');
    d.style.cssText = css;
    (parent || layer).appendChild(d);
    return d;
  }

  // slim scrims: they give the frame edges some weight, the difference blend does the legibility
  el('position:absolute;left:0;right:0;top:0;height:190px;background:linear-gradient(to bottom,' +
    'rgba(0,0,0,0.38) 0%,rgba(0,0,0,0.12) 55%,rgba(0,0,0,0) 100%)');
  el('position:absolute;left:0;right:0;bottom:0;height:140px;background:linear-gradient(to top,' +
    'rgba(0,0,0,0.38) 0%,rgba(0,0,0,0) 100%)');

  // ---- frame chrome: crop corners, tick rail, the reel's vitals ----
  var chrome = el('position:absolute;inset:0;mix-blend-mode:difference;opacity:0;' +
    'transition:opacity 1.1s ease 0.5s');
  ['left:26px;top:96px;border-left:1px solid;border-top:1px solid',
   'right:26px;top:96px;border-right:1px solid;border-top:1px solid',
   'left:26px;bottom:26px;border-left:1px solid;border-bottom:1px solid',
   'right:26px;bottom:26px;border-right:1px solid;border-bottom:1px solid'].forEach(function (c) {
    el('position:absolute;width:20px;height:20px;border-color:' + HAIR + ';' + c, chrome);
  });

  var rail = el('position:absolute;left:26px;top:132px;bottom:74px;width:1px;background:' + HAIR, chrome);
  for (var r = 0; r < SHOTS.length; r++) {
    el('position:absolute;left:0;top:' + (r * 100 / (SHOTS.length - 1)) + '%;width:6px;height:1px;background:' +
      HAIR + ';transition:width 0.5s ' + EASE + ',background 0.5s ease', rail).className = 'vg-hv-tick';
  }
  var ticks = rail.querySelectorAll('.vg-hv-tick');

  var headSub = el('position:absolute;left:60px;top:96px;color:#ffffff;' + MONO, chrome);
  headSub.textContent = 'SKETCH \u2192 CAD \u2192 CUT \u2192 TEST';

  var count = el('position:absolute;right:60px;top:96px;color:#ffffff;text-align:right;' + MONO, chrome);
  count.textContent = '10 SHOTS / 00:28';
  // narrow screens: home.css pulls these in from the edges and drops the shot count
  headSub.classList.add('vg-hud-l'); count.classList.add('vg-hud-count');

  var side = el('position:absolute;right:30px;top:50%;color:#ffffff;' + MONO +
    ';white-space:nowrap;writing-mode:vertical-rl;transform:translateY(-50%);letter-spacing:0.22em', chrome);
  side.textContent = 'DESIGN REDESIGN REPEAT';

  var foot = el('position:absolute;left:60px;bottom:26px;display:flex;align-items:baseline;gap:12px', chrome);
  el('width:5px;height:5px;background:#ffffff', foot);
  var capBox = el('overflow:hidden;height:16px', foot);
  var capIn = el('color:#ffffff;' + MONO + ';font-size:11px;letter-spacing:0.14em;' +
    'transform:translateY(112%);transition:transform 1s ' + EASE, capBox);
  var idx = el('position:absolute;right:60px;bottom:26px;color:#ffffff;text-align:right;' + MONO, chrome);
  foot.classList.add('vg-hud-l'); idx.classList.add('vg-hud-r');

  // one hairline sweeps the frame each time a shot lands
  var scan = el('position:absolute;left:0;top:0;bottom:0;width:1px;background:linear-gradient(to bottom,' +
    'rgba(236,126,65,0) 0%,' + ACCENT + ' 22%,' + ACCENT + ' 78%,rgba(236,126,65,0) 100%);opacity:0');

  var ann = el('position:absolute;inset:0;opacity:0;transition:opacity 0.3s ease');

  // ---- halftone screen: a patch of the video itself, dot-screened through a mask ----
  var halfWrap = el('position:absolute;display:none;overflow:hidden', ann);
  var DOTS = 'radial-gradient(circle at center, #000 0 40%, rgba(0,0,0,0) 44%)';
  var half = el('position:absolute;inset:0;' +
    (lite ? 'background-image:radial-gradient(rgba(255,255,255,0.55) 1px,transparent 1.4px);' +
      'background-size:6px 6px;'
          : 'backdrop-filter:grayscale(1) contrast(1.22);' +
      '-webkit-backdrop-filter:grayscale(1) contrast(1.22);' +
      '-webkit-mask-image:' + DOTS + ';mask-image:' + DOTS + ';' +
      '-webkit-mask-size:6px 6px;mask-size:6px 6px;mask-repeat:repeat;'), halfWrap);
  var halfTicks = ['left:0;top:0;border-left:1px solid;border-top:1px solid',
   'right:0;top:0;border-right:1px solid;border-top:1px solid',
   'left:0;bottom:0;border-left:1px solid;border-bottom:1px solid',
   'right:0;bottom:0;border-right:1px solid;border-bottom:1px solid'].map(function (c) {
    return el('position:absolute;width:9px;height:9px;border-color:rgba(255,255,255,0.34);' + c, halfWrap);
  });

  // ---- pixel block: a dither grid that keeps working while it is on screen ----
  // The pattern scrolls one column per beat and the block drifts a couple of pixels, so it reads as
  // a live readout rather than a pasted picture of a grid.
  var COLS = 6, ROWS = 3, CELL = 7, STEP = 9;
  var PIX = [1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1];
  var pixWrap = el('position:absolute;display:none;width:' + (COLS * STEP - 2) + 'px;height:' +
    (ROWS * STEP - 2) + 'px', ann);
  var cells = PIX.map(function (on, k) {
    return el('position:absolute;width:' + CELL + 'px;height:' + CELL + 'px;left:' + (k % COLS) * STEP +
      'px;top:' + Math.floor(k / COLS) * STEP + 'px;box-sizing:border-box;opacity:0;' +
      'transition:background 0.22s linear,border-color 0.22s linear', pixWrap);
  });
  var pixBeat = -1;
  function pixTick(t) {
    var beat = Math.floor(t / 0.16);
    if (beat === pixBeat) return;
    pixBeat = beat;
    for (var k = 0; k < cells.length; k++) {
      var col = k % COLS, row = Math.floor(k / COLS);
      // the base pattern shifted left one column per beat, with a slow diagonal riding over it
      var on = PIX[(row * COLS + ((col + beat) % COLS))] === 1;
      if ((col + row + beat) % 7 === 0) on = !on;
      cells[k].style.background = on ? 'rgba(255,255,255,0.62)' : 'transparent';
      cells[k].style.borderWidth = on ? '0' : '1px';
      cells[k].style.borderStyle = 'solid';
      cells[k].style.borderColor = on ? 'transparent' : 'rgba(255,255,255,0.3)';
    }
  }

  // ---- crosshair: a registration mark on one detail ----
  var crossWrap = el('position:absolute;display:none;width:0;height:0', ann);
  var cH = el('position:absolute;left:-24px;top:0;width:48px;height:1px;background:' + SOFT +
    ';transform:scaleX(0);transition:transform 0.7s ' + EASE, crossWrap);
  var cV = el('position:absolute;left:0;top:-24px;width:1px;height:48px;background:' + SOFT +
    ';transform:scaleY(0);transition:transform 0.7s ' + EASE + ' 0.1s', crossWrap);
  var cRing = el('position:absolute;left:-7px;top:-7px;width:14px;height:14px;border:1px solid ' + ACCENT +
    ';border-radius:50%;opacity:0;transition:opacity 0.4s ease 0.3s', crossWrap);

  // ---- bracket + leader + label ----
  var mark = el('position:absolute;display:none;border:1px solid ' + SOFT, ann);
  ['left:-1px;top:-1px', 'right:-1px;top:-1px', 'left:-1px;bottom:-1px', 'right:-1px;bottom:-1px'].forEach(function (c) {
    el('position:absolute;width:4px;height:4px;background:' + ACCENT + ';' + c, mark);
  });
  var leader = el('position:absolute;display:none;height:1px;background:' + SOFT +
    ';transform-origin:left center', ann);
  var labWrap = el('position:absolute;display:none;flex-direction:column;gap:3px', ann);
  var labMask = el('overflow:hidden;height:16px', labWrap);
  var labIn = el('color:' + ACCENT + ';' + MONO + ';font-size:11px;white-space:nowrap;text-shadow:' + SHADOW +
    ';transform:translateY(112%);transition:transform 0.95s ' + EASE, labMask);
  var labRule = el('height:1px;background:' + SOFT + ';transform:scaleX(0);transform-origin:left center;' +
    'transition:transform 0.8s ' + EASE, labWrap);

  // ---- polygon outlines: the same hairlines as the rect devices, drawn as paths ----
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;overflow:visible');
  ann.appendChild(svg);
  function poly(stroke, w) {
    var p = document.createElementNS(NS, 'polygon');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', stroke);
    p.setAttribute('stroke-width', w || 1);
    p.setAttribute('style', 'display:none');
    svg.appendChild(p);
    return p;
  }
  var halfLine = poly('rgba(255,255,255,0.34)');
  var markLine = poly(SOFT);
  var markNodes = document.createElementNS(NS, 'g');
  markNodes.setAttribute('style', 'display:none');
  svg.appendChild(markNodes);

  // closest point anywhere on a polygon's boundary — the leader's landing spot
  function nearestOnEdges(pp, x, y) {
    var best = pp[0], bd = Infinity;
    for (var i = 0; i < pp.length; i++) {
      var a = pp[i], b = pp[(i + 1) % pp.length];
      var vx = b.x - a.x, vy = b.y - a.y;
      var len = vx * vx + vy * vy;
      var f = len ? Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / len)) : 0;
      var qx = a.x + vx * f, qy = a.y + vy * f;
      var d = (qx - x) * (qx - x) + (qy - y) * (qy - y);
      if (d < bd) { bd = d; best = { x: qx, y: qy }; }
    }
    return best;
  }

  function bbox(pts) {
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    pts.forEach(function (p) {
      if (p.u < x0) x0 = p.u; if (p.v < y0) y0 = p.v;
      if (p.u > x1) x1 = p.u; if (p.v > y1) y1 = p.v;
    });
    return { u: x0, v: y0, w: x1 - x0, h: y1 - y0 };
  }

  // frame fraction -> container px, accounting for the object-fit: cover crop
  function map(u, v) {
    var bw = box.clientWidth, bh = box.clientHeight;
    var s = Math.max(bw / 16, bh / 9);
    var vw = 16 * s, vh = 9 * s;
    return { x: (bw - vw) / 2 + u * vw, y: (bh - vh) / 2 + v * vh };
  }
  // and back again, for the dev editor's drag handles
  function unmap(x, y) {
    var bw = box.clientWidth, bh = box.clientHeight;
    var s = Math.max(bw / 16, bh / 9);
    var vw = 16 * s, vh = 9 * s;
    return { u: (x - (bw - vw) / 2) / vw, v: (y - (bh - vh) / 2) / vh };
  }

  // devices may run under the wordmark, but they thin out as they approach it: both groups are
  // masked with a soft hole over the name and role line. The hole stays tight so nothing is erased.
  var title = document.getElementById('vg-hero-title');
  var sub = document.getElementById('vg-hero-sub');
  function maskTitle() {
    if (!title) return;
    var cx = title.offsetLeft + title.offsetWidth / 2;
    var top = title.offsetTop, bottom = sub ? sub.offsetTop + sub.offsetHeight : top + title.offsetHeight;
    var cy = (top + bottom) / 2;
    var rx = title.offsetWidth / 2 + 24, ry = (bottom - top) / 2 + 18;
    var m = 'radial-gradient(' + rx.toFixed(0) + 'px ' + ry.toFixed(0) + 'px at ' + cx.toFixed(0) + 'px ' +
      cy.toFixed(0) + 'px, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 46%, #000 80%)';
    ann.style.webkitMaskImage = m;
    ann.style.maskImage = m;
    chrome.style.webkitMaskImage = m;
    chrome.style.maskImage = m;
  }

  var H_setLabel;
  var leaderScale = 0;
  function place(shot, t) {
    var bw = box.clientWidth, bh = box.clientHeight;
    var sHalf = sample(shot.half, t), sPix = sample(shot.pix, t), sCross = sample(shot.cross, t);
    var sMark = sample(shot.mark, t), sAt = sample(shot.at, t);

    if (sHalf) {
      // a polygon screen keeps the same wrapper (so the flood reveal still works) and clips the dot
      // field to the shape, with the outline drawn as a path instead of corner ticks
      var hb = sHalf.pts ? bbox(sHalf.pts) : sHalf;
      var h0 = map(hb.u, hb.v), h1 = map(hb.u + hb.w, hb.v + hb.h);
      halfWrap.style.display = 'block';
      halfWrap.style.left = h0.x + 'px'; halfWrap.style.top = h0.y + 'px';
      halfWrap.style.width = (h1.x - h0.x) + 'px'; halfWrap.style.height = (h1.y - h0.y) + 'px';
      if (sHalf.pts) {
        half.style.clipPath = 'polygon(' + sHalf.pts.map(function (p) {
          return ((p.u - hb.u) / hb.w * 100).toFixed(2) + '% ' + ((p.v - hb.v) / hb.h * 100).toFixed(2) + '%';
        }).join(',') + ')';
        halfLine.setAttribute('points', sHalf.pts.map(function (p) {
          var q = map(p.u, p.v); return q.x.toFixed(1) + ',' + q.y.toFixed(1);
        }).join(' '));
        halfLine.style.display = '';
        halfTicks.forEach(function (d) { d.style.display = 'none'; });
      } else {
        half.style.clipPath = 'none';
        halfLine.style.display = 'none';
        halfTicks.forEach(function (d) { d.style.display = ''; });
      }
    } else { halfWrap.style.display = 'none'; halfLine.style.display = 'none'; }

    if (sPix) {
      var pp = map(sPix.u, sPix.v);
      // a slow two-pixel drift, tied to the clock so it never fights the beat
      pixWrap.style.display = 'block';
      pixWrap.style.left = (Math.max(40, Math.min(bw - 94, pp.x)) + Math.sin(t * 1.6) * 2) + 'px';
      pixWrap.style.top = (Math.max(126, Math.min(bh - 70, pp.y)) + Math.cos(t * 1.1) * 2) + 'px';
    } else pixWrap.style.display = 'none';

    if (sCross) {
      var cp = map(sCross.u, sCross.v);
      crossWrap.style.display = 'block';
      crossWrap.style.left = cp.x + 'px'; crossWrap.style.top = cp.y + 'px';
    } else crossWrap.style.display = 'none';

    if (!sMark) {
      mark.style.display = 'none'; markLine.style.display = 'none'; markNodes.style.display = 'none';
      leader.style.display = 'none'; labWrap.style.display = 'none'; return;
    }
    var mb = sMark.pts ? bbox(sMark.pts) : sMark;
    var a = map(mb.u, mb.v);
    var b = map(mb.u + mb.w, mb.v + mb.h);
    if (sMark.pts) {
      // the bracket becomes an outline through the nodes, each node pinned by a small square
      mark.style.display = 'none';
      markLine.setAttribute('points', sMark.pts.map(function (p) {
        var q = map(p.u, p.v); return q.x.toFixed(1) + ',' + q.y.toFixed(1);
      }).join(' '));
      markLine.style.display = '';
      while (markNodes.childNodes.length > sMark.pts.length) markNodes.removeChild(markNodes.lastChild);
      while (markNodes.childNodes.length < sMark.pts.length) {
        var sq = document.createElementNS(NS, 'rect');
        sq.setAttribute('width', 4); sq.setAttribute('height', 4); sq.setAttribute('fill', ACCENT);
        markNodes.appendChild(sq);
      }
      sMark.pts.forEach(function (p, n) {
        var q = map(p.u, p.v);
        markNodes.childNodes[n].setAttribute('x', (q.x - 2).toFixed(1));
        markNodes.childNodes[n].setAttribute('y', (q.y - 2).toFixed(1));
      });
      markNodes.style.display = '';
    } else {
      markLine.style.display = 'none'; markNodes.style.display = 'none';
      mark.style.display = 'block';
      mark.style.left = a.x + 'px'; mark.style.top = a.y + 'px';
      mark.style.width = (b.x - a.x) + 'px'; mark.style.height = (b.y - a.y) + 'px';
    }

    if (!shot.label || !sAt) { leader.style.display = 'none'; labWrap.style.display = 'none'; return; }
    var p = map(sAt.u, sAt.v);
    p.x = Math.max(64, Math.min(bw - 64, p.x));
    p.y = Math.max(126, Math.min(bh - 56, p.y));
    // the label sits on whichever side of the bracket it was anchored to, unless that side has run
    // out of frame — then it flips rather than sliding off the edge
    var right = sAt.u > mb.u + mb.w / 2;
    var wide = Math.max(44, labIn.scrollWidth || 90);
    if (!right && p.x - wide < 56) right = true;
    if (right && p.x + wide > bw - 56) right = false;
    labWrap.style.display = 'flex';
    labWrap.style.left = p.x + 'px';
    labWrap.style.top = p.y + 'px';
    labWrap.style.alignItems = right ? 'flex-start' : 'flex-end';
    labWrap.style.transform = right ? 'none' : 'translateX(-100%)';
    labRule.style.width = wide + 'px';
    labRule.style.transformOrigin = right ? 'left center' : 'right center';

    // the leader starts at the end of the label's rule that faces the bracket, and lands exactly on
    // the bracket's border — the nearest point on the rectangle, pushed out to the closest edge if
    // that point falls inside it
    var ruleY = p.y + 18;
    var lLeft = right ? p.x : p.x - wide, lRight = right ? p.x + wide : p.x;
    var tx, ty, sx;
    if (sMark.pts) {
      var pp = sMark.pts.map(function (q) { return map(q.u, q.v); });
      var c1 = nearestOnEdges(pp, lLeft, ruleY), c2 = nearestOnEdges(pp, lRight, ruleY);
      if (Math.hypot(c1.x - lLeft, c1.y - ruleY) <= Math.hypot(c2.x - lRight, c2.y - ruleY)) {
        sx = lLeft; tx = c1.x; ty = c1.y;
      } else { sx = lRight; tx = c2.x; ty = c2.y; }
    } else {
      var bcx = (a.x + b.x) / 2;
      sx = bcx >= lRight ? lRight : bcx <= lLeft ? lLeft : (bcx > (lLeft + lRight) / 2 ? lRight : lLeft);
      tx = Math.max(a.x, Math.min(b.x, sx));
      ty = Math.max(a.y, Math.min(b.y, ruleY));
      if (tx > a.x && tx < b.x && ty > a.y && ty < b.y) {
        var dL = tx - a.x, dR = b.x - tx, dT = ty - a.y, dB = b.y - ty;
        var m2 = Math.min(dL, dR, dT, dB);
        if (m2 === dL) tx = a.x; else if (m2 === dR) tx = b.x; else if (m2 === dT) ty = a.y; else ty = b.y;
      }
    }
    var dx = tx - sx, dy = ty - ruleY;
    leaderDeg = Math.atan2(dy, dx) * 180 / Math.PI;
    leader.style.display = 'block';
    leader.style.left = sx + 'px';
    leader.style.top = ruleY + 'px';
    leader.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
    leader.style.transform = 'rotate(' + leaderDeg + 'deg) scaleX(' + leaderScale + ')';
  }

  var cur = -1, shown = false, leaderDeg = 0, entryTimer = null;
  H_setLabel = function (txt) { labIn.textContent = txt; };
  function enter(i, t) {
    var shot = SHOTS[i];
    if (shot.label) labIn.textContent = shot.label;
    capIn.textContent = shot.cap;
    maskTitle();
    leaderScale = 0;
    place(shot, t);
    ann.style.opacity = '1';

    if (shot.half) {
      // the screen creeps outward from its own centre, like the tile flood
      half.style.transition = 'none';
      halfWrap.style.clipPath = 'circle(0% at 50% 50%)';
      void halfWrap.offsetWidth;
      halfWrap.style.transition = 'clip-path 1.1s ' + FLOOD;
      halfWrap.style.clipPath = 'circle(85% at 50% 50%)';
    }
    if (shot.pix) {
      pixBeat = -1;
      cells.forEach(function (c, k) {
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = 'vgHvCell 0.34s ' + EASE + ' ' + (0.05 + k * 0.035) + 's 1 both';
      });
    }
    if (shot.cross) {
      cH.style.transition = 'none'; cV.style.transition = 'none'; cRing.style.transition = 'none';
      cH.style.transform = 'scaleX(0)'; cV.style.transform = 'scaleY(0)'; cRing.style.opacity = '0';
      void cH.offsetWidth;
      cH.style.transition = 'transform 0.7s ' + EASE;
      cV.style.transition = 'transform 0.7s ' + EASE + ' 0.1s';
      cRing.style.transition = 'opacity 0.4s ease 0.3s';
      cH.style.transform = 'scaleX(1)'; cV.style.transform = 'scaleY(1)'; cRing.style.opacity = '1';
    }
    if (shot.mark) {
      var flashOn = shot.mark.pts || (shot.mark.keys && shot.mark.keys[0].pts) ? svg : mark;
      flashOn.style.animation = 'none';
      void flashOn.getBoundingClientRect();
      flashOn.style.animation = 'vgHvFlash 0.55s steps(1,end) 1 both';
    }
    if (shot.label) {
      leader.style.transition = 'none';
      void leader.offsetWidth;
      leader.style.transition = 'transform 0.7s ' + EASE + ' 0.18s';
      leaderScale = 1;
      leader.style.transform = 'rotate(' + leaderDeg + 'deg) scaleX(1)';
      labIn.style.transform = 'translateY(112%)';
      labRule.style.transform = 'scaleX(0)';
      void labIn.offsetWidth;
      clearTimeout(entryTimer);
      entryTimer = setTimeout(function () {
        labIn.style.transform = 'translateY(0)';
        labRule.style.transform = 'scaleX(1)';
        // once the line has drawn, drop the transition so a tracked bracket stays glued to its object
        setTimeout(function () { leader.style.transition = 'none'; }, 700);
      }, 320);
    } else leaderScale = 0;
    capIn.style.transform = 'translateY(112%)';
    void capIn.offsetWidth;
    setTimeout(function () { capIn.style.transform = 'translateY(0)'; }, 200);
    scan.style.animation = 'none';
    void scan.offsetWidth;
    scan.style.animation = 'vgHvScan 1.9s linear 1 both';
    for (var k = 0; k < ticks.length; k++) {
      ticks[k].style.width = k === i ? '15px' : '6px';
      ticks[k].style.background = k === i ? '#ffffff' : HAIR;
    }
  }

  function leave() { ann.style.opacity = '0'; capIn.style.transform = 'translateY(112%)'; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var last = -1, held = false;
  // the reel only runs while the hero is on screen: off screen it stops dead and rewinds, so it
  // costs nothing while the grid is being read and starts from its first shot on the way back up
  var onScreen = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (es) {
      var vis = es[0].isIntersecting;
      if (vis === onScreen) return;
      onScreen = vis;
      if (vis) {
        try { video.currentTime = 0; video.play(); } catch (e) {}
      } else {
        try { video.pause(); video.currentTime = 0; } catch (e) {}
        cur = -1; last = -1;
        ann.style.opacity = '0';
      }
    }, { threshold: 0.01 }).observe(box);
  }

  var wasPlaying = false;
  function frame() {
    if (!onScreen) { requestAnimationFrame(frame); return; }
    if (window.__vgBusy) {
      if (!wasPlaying && !video.paused) { wasPlaying = true; try { video.pause(); } catch (e) {} }
      requestAnimationFrame(frame);
      return;
    }
    if (wasPlaying) { wasPlaying = false; try { video.play(); } catch (e) {} }
    if (!held) {
      var t = video.currentTime || 0;
      if (!shown && t > 0.2) { shown = true; chrome.style.opacity = '1'; }
      idx.textContent = '00:' + pad(Math.floor(t)) + '.' + Math.floor((t % 1) * 10) +
        '  /  SHOT ' + pad(cur < 0 ? 0 : cur + 1);
      var hit = -1;
      for (var i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0 && t < SHOTS[i].t1) { hit = i; break; }
      if (hit !== last) {
        if (hit < 0) leave(); else { cur = hit; enter(hit, t); }
        last = hit;
      } else if (hit >= 0) {
        // re-place every frame so keyframed (tracked) geometry follows its object, and keep the
        // dither grid beating for as long as the shot is up
        place(SHOTS[hit], t);
        pixTick(t);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  maskTitle();
  // the hole is measured off the wordmark, so re-measure once the display face has actually landed
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(maskTitle);
  setTimeout(maskTitle, 900);
  setTimeout(maskTitle, 2200);

  var rt;
  addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { maskTitle(); if (cur >= 0) place(SHOTS[cur], video.currentTime || 0); }, 120);
  });

  // handle for the dev mask editor; harmless in the shipped site
  window.__vgHero = {
    SHOTS: SHOTS, video: video, box: box, layer: layer, ann: ann,
    map: map, unmap: unmap, sample: sample,
    shotAt: function (t) { for (var i = 0; i < SHOTS.length; i++) if (t >= SHOTS[i].t0 && t < SHOTS[i].t1) return i; return -1; },
    hold: function (on) { held = !!on; if (!on) last = -2; },
    setLabel: function (txt) { H_setLabel(txt); },
    show: function (i, t) { cur = i; last = i; leaderScale = 1; ann.style.opacity = '1'; chrome.style.opacity = '1';
      if (SHOTS[i].label) labIn.textContent = SHOTS[i].label;
      capIn.textContent = SHOTS[i].cap; capIn.style.transform = 'translateY(0)';
      labIn.style.transform = 'translateY(0)'; labRule.style.transform = 'scaleX(1)';
      leader.style.transition = 'none'; halfWrap.style.transition = 'none';
      halfWrap.style.clipPath = 'circle(85% at 50% 50%)';
      cells.forEach(function (c) { c.style.animation = 'none'; c.style.opacity = '1'; });
      cH.style.transform = 'scaleX(1)'; cV.style.transform = 'scaleY(1)'; cRing.style.opacity = '1';
      pixBeat = -1; pixTick(t); place(SHOTS[i], t); }
  };
})();
