# Weather background module

The reusable background consists of `weatherBackground.js` and `weatherBackground.css`.

## Basic integration

```html
<link rel="stylesheet" href="weatherBackground.css">
<script src="weatherBackground.js"></script>
<script>
    const background = new WeatherBackgroundManager({
        onThunder: () => console.log('thunder')
    }).init();

    background.setWeather({
        condition: 'rain',
        isDay: true,
        windSpeed: 6,
        intensity: 0.45
    });
</script>
```

Supported conditions are `sunny`, `clouds`, `drizzle`, `rain`, `storm`, `snow`, `mist`, `smoke`, `haze`, `dust`, and `wind`.

For OpenWeatherMap data, normalize the response with `mapWeatherToEffect(response)` and pass the result to `setWeather`:

```js
background.setWeather(mapWeatherToEffect(apiResponse));
```

The manager owns the fixed canvas, resize and device-pixel-ratio handling, page visibility pause/resume, reduced-motion scaling, wind overlays, transitions, and effect cleanup. Call `background.destroy()` when the host view is removed.
