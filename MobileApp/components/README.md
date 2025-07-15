# Glassmorphism & Animation Components

This directory contains enhanced UI components that add glassmorphism effects and smooth animations to your React Native app.

## Components Overview

### 🌟 GlassmorphicCard.js
A reusable card component with frosted glass effect (glassmorphism).

**Features:**
- Cross-platform blur effects using `@react-native-community/blur`
- Customizable blur amount and type
- Automatic fallback for reduced transparency
- Built-in shadow and border styling

**Usage:**
```jsx
import GlassmorphicCard from '../components/GlassmorphicCard';

<GlassmorphicCard 
  style={{padding: 20}}
  blurAmount={15}
  blurType="light"
>
  <Text>Your content here</Text>
</GlassmorphicCard>
```

**Props:**
- `children`: React elements to display inside the card
- `style`: Additional styling for the container
- `blurType`: 'light' or 'dark' (iOS only)
- `blurAmount`: Number (1-100, default: 10)

---

### ✨ AnimatedFadeInView.js
A flexible animation wrapper that provides entrance animations.

**Features:**
- Multiple animation types: fade, slideUp, slideDown, scale
- Customizable duration and delay
- Spring animations for natural movement
- Smooth timing functions

**Usage:**
```jsx
import AnimatedFadeInView from '../components/AnimatedFadeInView';

<AnimatedFadeInView 
  delay={300}
  duration={600}
  animationType="slideUp"
>
  <Text>This will slide up with a fade</Text>
</AnimatedFadeInView>
```

**Props:**
- `children`: React elements to animate
- `style`: Additional styling
- `duration`: Animation duration in ms (default: 600)
- `delay`: Delay before animation starts in ms (default: 0)
- `animationType`: 'fade', 'slideUp', 'slideDown', 'scale' (default: 'fade')

---

### 🎯 AnimatedButton.js
An enhanced button component with press animations and multiple variants.

**Features:**
- Press animations with scale and opacity effects
- Multiple variants: primary, secondary, outline
- Size options: small, medium, large
- Disabled state handling
- Spring-based animations

**Usage:**
```jsx
import AnimatedButton from '../components/AnimatedButton';

<AnimatedButton
  variant="primary"
  size="medium"
  onPress={() => console.log('Pressed!')}
>
  Click Me
</AnimatedButton>
```

**Props:**
- `children`: Button content (text or JSX)
- `onPress`: Function to call when pressed
- `style`: Additional button styling
- `textStyle`: Additional text styling
- `variant`: 'primary', 'secondary', 'outline' (default: 'primary')
- `size`: 'small', 'medium', 'large' (default: 'medium')
- `disabled`: Boolean (default: false)

---

### 🎪 StaggeredView.js
Creates staggered animations for lists and multiple elements.

**Features:**
- Automatic stagger timing based on index
- Multiple animation types
- Perfect for list items and card grids
- Customizable stagger delay

**Usage:**
```jsx
import StaggeredView from '../components/StaggeredView';

{items.map((item, index) => (
  <StaggeredView 
    key={item.id}
    index={index}
    staggerDelay={100}
    animationType="slideUp"
  >
    <ItemCard item={item} />
  </StaggeredView>
))}
```

**Props:**
- `children`: React elements to animate
- `style`: Additional styling
- `index`: Position in the list (for stagger calculation)
- `staggerDelay`: Delay between each item in ms (default: 100)
- `animationType`: 'slideUp', 'slideLeft', 'scale', 'fade' (default: 'slideUp')
- `duration`: Animation duration in ms (default: 600)

## Implementation in Home.js

The Home screen now showcases all these components:

1. **Feature Cards**: Use `GlassmorphicCard` with `StaggeredView` for a premium look
2. **Action Buttons**: Replaced with `AnimatedButton` for better interaction feedback
3. **Section Animations**: Wrapped with `AnimatedFadeInView` for smooth page loading
4. **Scheme Cards**: Enhanced with glassmorphism effects

## Dependencies

Make sure you have installed:
```bash
npm install @react-native-community/blur
npx pod-install  # For iOS
```

## Theme Integration

All components automatically use colors and values from your `theme.config.js`:
- Primary and secondary colors
- Border radius values
- Font families
- Shadow colors
- Spacing values

## Performance Notes

- Animations use native drivers where possible
- Blur effects are optimized for both platforms
- Components are lightweight and reusable
- No external dependencies beyond the blur library

Enjoy your enhanced UI! 🚀
