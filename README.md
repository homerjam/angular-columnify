# angular-columnify

Angular directive that creates balanced columns


## Usage

1. Add `hj.columnify` to your app dependencies

2. Add `.column` style declaration to your css

```css
    .column {
        float: left;
        width: 50%; /* 50% for two columns, 33.33% for three etc */
    }
```

3. Add `hj-columnify` directive to your template, it works just like `ng-repeat`

```html
    <div hj-columnify="item in items">

        <div class="box" data-index="{{$index + 1}}">

            Content goes here

        </div>

    </div>
```

## Installation

`bower install angular-columnify --save`


## Demo

http://homerjam.github.io/angular-columnify/