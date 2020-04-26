// from https://codepen.io/sayzlim/pen/geOONP.js
var _native = (function () {
  var _options = {}
  var _local = window.localStorage
  var _construct = function (e) {
    var defaultOptions = {
      carbonZoneKey: '',
      fallback: '',
      ignore: 'false',
      placement: '',
      prefix: 'native',
      targetClass: 'native-ad'
    }

    if (typeof e === 'undefined') return defaultOptions
    Object.keys(defaultOptions).forEach(function (key, index) {
      if (typeof e[key] === 'undefined') {
        e[key] = defaultOptions[key]
      }
    })
    return e
  }

  var init = function (zone, options) {
    _options = _construct(options)

    if (isAdHidden() === true) {
      document.addEventListener('DOMContentLoaded', function () {
        _native.hide()
      })
      return
    }

    var jsonUrl = 'https://srv.buysellads.com/ads/' + zone + '.json?callback=_native_go'
    if (_options['placement'] !== '') {
      jsonUrl += '&segment=placement:' + _options['placement']
    }
    if (_options['ignore'] === 'true') {
      jsonUrl += '&ignore=yes'
    }

    var srv = document.createElement('script')
    srv.src = jsonUrl
    document.getElementsByTagName('head')[0].appendChild(srv)
  }

  var carbon = function (e) {
    var srv = document.createElement('script')
    srv.src = '//cdn.carbonads.com/carbon.js?serve=' + e['carbonZoneKey'] + '&placement=' + e['placement']
    srv.id = '_carbonads_js'

    return srv
  }

  var hide = function () {
    _local.setItem('native_hidden', 'true')

    if (_local.getItem('native_hidden_date') === null) {
      _local.setItem('native_hidden_date', new Date())
    }

    var selectedClass = Array.from(document.querySelectorAll('.' + _options['targetClass']))
    selectedClass.forEach(function (className, index) {
      var selectedTarget = document.getElementsByClassName(_options['targetClass'])[index]
      selectedTarget.innerHTML = ''
      selectedTarget.style.display = 'none'
    })
  }

  var isAdHidden = function () {
    if (_local.getItem('native_hidden') === 'true') {
      var currentDate = new Date() / 1000
      var hiddenDate = new Date(_local.getItem('native_hidden_date')) / 1000
      var hiddenPeriod = currentDate - hiddenDate
      var hiddenDuration = 60 // seconds
      if (hiddenPeriod > hiddenDuration) {
        _local.removeItem('native_hidden_date')
        return false
      }
      return true
    }
  }

  var sanitize = function (ads) {
    return ads
      .filter(function (ad) {
        return Object.keys(ad).length > 0
      })
      .filter(function (ad) {
        return ad.hasOwnProperty('statlink')
      })
  }

  var pixel = function (p, timestamp) {
    var c = ''
    if (p) {
      p.split('||').forEach(function (pixel, index) {
        c += '<img src="' + pixel.replace('[timestamp]', timestamp) + '" style="display:none;" height="0" width="0" />'
      })
    }
    return c
  }

  var options = function () {
    return _options
  }

  return {
    carbon: carbon,
    init: init,
    hide: hide,
    options: options,
    pixel: pixel,
    sanitize: sanitize
  }
})({})

var _native_go = function (json) {
  var options = _native.options()
  var ads = _native.sanitize(json['ads'])
  var selectedClass = Array.from(document.querySelectorAll('.' + options['targetClass']))

  if (ads.length < 1) {
    selectedClass.forEach(function (className, index) {
      var selectedTarget = document.getElementsByClassName(options['targetClass'])[index]

      if (options['fallback'] !== '' || options['carbonZoneKey'] !== '') selectedTarget.setAttribute('data-state', 'visible')
      selectedTarget.innerHTML = options['fallback']
      if (options['carbonZoneKey'] !== '') selectedTarget.appendChild(_native.carbon(options))
    })

    // End at this line if no ads are found, avoiding unnecessary steps
    return
  }

  selectedClass.forEach(function (className, index) {
    var selectedTarget = document.getElementsByClassName(options['targetClass'])[index]
    var adElement = selectedTarget.innerHTML
    var prefix = options['prefix']
    var ad = ads[index]

    if (ad && className) {
      var adInnerHtml = adElement
        .replace(new RegExp('#' + prefix + '_via_link#', 'g'), ad['ad_via_link'])
        .replace(new RegExp('#' + prefix + '_bg_color#', 'g'), ad['backgroundColor'])
        .replace(new RegExp('#' + prefix + '_bg_color_hover#', 'g'), ad['backgroundHoverColor'])
        .replace(new RegExp('#' + prefix + '_company#', 'g'), ad['company'])
        .replace(new RegExp('#' + prefix + '_cta#', 'g'), ad['callToAction'])
        .replace(new RegExp('#' + prefix + '_cta_bg_color#', 'g'), ad['ctaBackgroundColor'])
        .replace(new RegExp('#' + prefix + '_cta_bg_color_hover#', 'g'), ad['ctaBackgroundHoverColor'])
        .replace(new RegExp('#' + prefix + '_cta_color#', 'g'), ad['ctaTextColor'])
        .replace(new RegExp('#' + prefix + '_cta_color_hover#', 'g'), ad['ctaTextColorHover'])
        .replace(new RegExp('#' + prefix + '_desc#', 'g'), ad['description'])
        .replace(new RegExp('#' + prefix + '_index#', 'g'), prefix + '-' + ad['i'])
        .replace(new RegExp('#' + prefix + '_img#', 'g'), ad['image'])
        .replace(new RegExp(prefix + '_src="#' + prefix + '_small_img#"', 'g'), 'src="' + ad['smallImage'] + '"')
        .replace(new RegExp('#' + prefix + '_link#', 'g'), ad['statlink'])
        .replace(new RegExp(prefix + '_src="#' + prefix + '_logo#"', 'g'), 'src="' + ad['logo'] + '"')
        .replace(new RegExp('#' + prefix + '_color#', 'g'), ad['textColor'])
        .replace(new RegExp('#' + prefix + '_color_hover#', 'g'), ad['textColorHover'])
        .replace(new RegExp('#' + prefix + '_title#', 'g'), ad['title'])

      selectedTarget.innerHTML = ''
      selectedTarget.innerHTML += adInnerHtml + _native.pixel(ad['pixel'], ad['timestamp'])
      selectedTarget.setAttribute('data-state', 'visible')
    } else {
      selectedTarget.innerHTML = ''
      selectedTarget.style.display = 'none'
    }
  })
}
