import React, {useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTranslation} from 'react-i18next';
import Feather from 'react-native-vector-icons/Feather';
import {SvgXml} from 'react-native-svg';
import {theme} from '../theme.config';
import {illustrations} from './assets/illustrations';
import {portraits} from './assets/portraits';
import {message} from './data';

const colors = {
  default: theme.surface,
  muted: theme.recessed,
  green: theme.paddySoft,
  info: theme.monsoonSoft,
  error: theme.alertSoft,
};
const ink = {
  default: theme.ink,
  muted: theme.inkSoft,
  green: theme.paddy,
  info: theme.monsoon,
  error: theme.alert,
  inverse: theme.inkInverse,
};
const destinations = [
  ['Home', 'home', 'home', 'Home'],
  ['Schemes', 'layers', 'scheme', 'Schemes'],
  ['CropCare', 'feather', 'cropCare', 'Crop Care'],
  ['Market', 'shopping-bag', 'market', 'Market'],
  ['News', 'file-text', 'news', 'News'],
];

export function Text({
  variant = 'body',
  tone = 'default',
  children,
  style,
  ...props
}) {
  const heading = ['title', 'heading', 'section'].includes(variant);
  return (
    <NativeText
      accessibilityRole={heading ? 'header' : undefined}
      {...props}
      style={[
        styles.text,
        styles[variant],
        {color: ink[tone] || theme.ink},
        style,
      ]}>
      {children}
    </NativeText>
  );
}

export function Stack({gap = 16, style, children}) {
  return <View style={[styles.stack, {gap}, style]}>{children}</View>;
}

export function Columns({gap = 16, children, breakpoint = 840}) {
  const {width} = useWindowDimensions();
  const wide = width >= breakpoint;
  return (
    <View style={[{gap}, wide && styles.columns]}>
      {React.Children.toArray(children).map(child => (
        <View
          key={child.key}
          style={[styles.column, wide && styles.wideColumn]}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function Icon({name, size = 22, color = theme.paddy}) {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      accessible={false}
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

export function Illustration({name, style}) {
  const xml = illustrations[name] || portraits[name];
  if (!xml) {
    return null;
  }
  return (
    <View
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <SvgXml xml={xml} width="100%" height="100%" aria-hidden />
    </View>
  );
}

export function Card({children, tone = 'default', onPress, style}) {
  const cardStyle = [
    styles.card,
    {backgroundColor: colors[tone] || colors.default},
    style,
  ];
  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  style,
}) {
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        styles[`${variant}Button`],
        style,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      {icon ? (
        <Icon
          name={icon}
          size={19}
          color={primary ? theme.inkInverse : theme.paddy}
        />
      ) : null}
      <Text
        variant="label"
        tone={primary ? 'inverse' : 'green'}
        style={styles.center}>
        {label}
      </Text>
    </Pressable>
  );
}

export function IconButton({label, icon, onPress, tone = 'default'}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.iconButton,
        {backgroundColor: colors[tone]},
        pressed && styles.pressed,
      ]}>
      <Icon name={icon} color={tone === 'muted' ? theme.ink : theme.paddy} />
    </Pressable>
  );
}

export function Field({
  label,
  placeholder,
  style,
  inputStyle,
  icon,
  ...inputProps
}) {
  return (
    <View style={[styles.fieldGroup, style]}>
      {label ? (
        <Text variant="small" style={styles.fieldLabel}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputWrap,
          inputProps.editable === false && styles.disabled,
        ]}>
        {icon ? <Icon name={icon} size={19} /> : null}
        <TextInput
          accessibilityLabel={label || placeholder}
          placeholder={placeholder}
          placeholderTextColor={theme.inkSoft}
          {...inputProps}
          style={[
            styles.input,
            inputProps.multiline && styles.multiline,
            inputStyle,
          ]}
        />
      </View>
    </View>
  );
}

function option(item) {
  return typeof item === 'string' ? {label: item, value: item} : item;
}

export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Choose an option',
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const entries = options.map(option);
  const selected = entries.find(item => item.value === value);
  return (
    <View style={styles.fieldGroup}>
      {label ? (
        <Text variant="small" style={styles.fieldLabel}>
          {label}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label || placeholder}, ${
          selected?.label || placeholder
        }`}
        accessibilityState={{expanded: open, disabled: !!disabled}}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.select, disabled && styles.disabled]}>
        <Text
          variant="small"
          tone={selected ? 'default' : 'muted'}
          style={styles.grow}>
          {selected?.label || placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={theme.inkSoft} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessible={false}
          />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.dialogHeading}>
              <Text variant="heading" style={styles.grow}>
                {label || placeholder}
              </Text>
              <IconButton
                label="Close options"
                icon="x"
                onPress={() => setOpen(false)}
              />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {entries.length ? (
                entries.map(item => (
                  <Row
                    key={item.value}
                    title={item.label}
                    end={item.value === value ? <Icon name="check" /> : null}
                    onPress={() => {
                      setOpen(false);
                      onChange(item.value);
                    }}
                  />
                ))
              ) : (
                <Text tone="muted">No options available.</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Tabs({items, value, onChange}) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {items.map(option).map(item => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{selected: active}}
            onPress={() => onChange(item.value)}
            style={[styles.tab, active && styles.activeTab]}>
            <Text
              variant="small"
              tone={active ? 'green' : 'muted'}
              style={[styles.center, active && styles.fieldLabel]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Row({title, description, icon, onPress, end, style}) {
  const content = (
    <>
      {typeof icon === 'string' ? <Icon name={icon} /> : icon}
      <Stack gap={2} style={styles.grow}>
        <Text variant="small" style={styles.fieldLabel}>
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted">
            {description}
          </Text>
        ) : null}
      </Stack>
      {end === undefined && onPress ? (
        <Icon name="chevron-right" size={18} />
      ) : (
        end
      )}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [styles.row, style, pressed && styles.pressed]}>
      {content}
    </Pressable>
  ) : (
    <View style={[styles.row, style]}>{content}</View>
  );
}

export function Notice({title, children, tone = 'muted'}) {
  return (
    <Card tone={tone}>
      {title ? <Text variant="section">{title}</Text> : null}
      {typeof children === 'string' ? (
        <Text tone="muted">{children}</Text>
      ) : (
        children
      )}
    </Card>
  );
}

export function Result({data, error, pending}) {
  if (pending) {
    return (
      <ActivityIndicator color={theme.paddy} accessibilityLabel="Loading" />
    );
  }
  if (error) {
    return (
      <Notice title="Could not load this information" tone="error">
        {message(error)}
      </Notice>
    );
  }
  const result =
    typeof data === 'string'
      ? data
      : data?.answer || data?.advice || data?.summary || data?.message;
  return typeof result === 'string' && result ? (
    <Notice title="Guidance">{result}</Notice>
  ) : null;
}

function Navigation({active, go, wide, hideAsk}) {
  const {t} = useTranslation();
  const bottom = useSafeAreaInsets().bottom;
  const ask = (
    <Row
      title="Ask Nila"
      description="Speak or type"
      icon="message-circle"
      onPress={() => go('AskNila')}
      style={wide ? styles.sideAsk : styles.ask}
    />
  );
  return (
    <View style={wide ? styles.sidebar : styles.footer}>
      {wide ? (
        <Text variant="section" style={styles.brand}>
          Nila Shoshsho
        </Text>
      ) : null}
      {!wide && !hideAsk && active !== 'Schemes' ? ask : null}
      <View
        style={
          wide
            ? styles.sideLinks
            : [styles.bottomNav, {paddingBottom: Math.max(bottom, 5)}]
        }>
        {destinations.map(([id, icon, key, fallback]) => {
          const current = id === active;
          const label = t(`navigation.${key}`, {defaultValue: fallback});
          return (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{selected: current}}
              onPress={() => go(id)}
              style={({pressed}) => [
                wide ? styles.sideLink : styles.bottomLink,
                wide && current && styles.activeSide,
                pressed && styles.pressed,
              ]}>
              <Icon name={icon} color={current ? theme.paddy : theme.inkSoft} />
              <Text
                variant="caption"
                tone={current ? 'green' : 'muted'}
                style={[!wide && styles.center, current && styles.fieldLabel]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {wide && !hideAsk ? ask : null}
    </View>
  );
}

export function Screen({
  title,
  eyebrow,
  back,
  children,
  right,
  primary,
  go,
  kind,
  hideAsk,
}) {
  const insets = useSafeAreaInsets();
  const {width} = useWindowDimensions();
  const wide = width >= 1024;
  const regular = width >= 680;
  const hasNav = Boolean(primary && go);
  const maxWidth =
    kind === 'auth' ? 520 : primary || kind === 'wide' ? 1200 : 760;
  return (
    <View
      style={[
        styles.shell,
        {paddingLeft: insets.left, paddingRight: insets.right},
      ]}>
      {wide && hasNav ? (
        <Navigation active={primary} go={go} wide hideAsk={hideAsk} />
      ) : null}
      <KeyboardAvoidingView
        style={styles.grow}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.grow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>
          <View
            style={[
              styles.content,
              regular ? styles.regularContent : styles.compactContent,
              {
                maxWidth,
                paddingTop: Math.max(insets.top + 12, regular ? 32 : 36),
                paddingBottom: Math.max(insets.bottom + 16, 24),
              },
              hasNav && styles.navigationContent,
            ]}>
            {title ? (
              <View style={styles.pageHeading}>
                {back ? (
                  <IconButton
                    label="Go back"
                    icon="arrow-left"
                    onPress={back}
                    tone="muted"
                  />
                ) : null}
                <Stack gap={1} style={styles.grow}>
                  {eyebrow ? (
                    <Text variant="caption" tone="muted">
                      {eyebrow}
                    </Text>
                  ) : null}
                  <Text variant={wide ? 'title' : 'heading'}>{title}</Text>
                </Stack>
                {right}
              </View>
            ) : null}
            {children}
          </View>
        </ScrollView>
        {!wide && hasNav ? (
          <Navigation active={primary} go={go} hideAsk={hideAsk} />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  text: {fontFamily: theme.font.regular, flexShrink: 1},
  title: {fontFamily: theme.font.semi, fontSize: theme.fs1, lineHeight: 35},
  heading: {fontFamily: theme.font.semi, fontSize: theme.fs2, lineHeight: 28},
  section: {fontFamily: theme.font.semi, fontSize: theme.fs4, lineHeight: 22},
  label: {fontFamily: theme.font.semi, fontSize: theme.fs4, lineHeight: 22},
  body: {fontSize: theme.fs5, lineHeight: 23},
  small: {fontSize: 14, lineHeight: 20},
  caption: {fontSize: theme.fs7, lineHeight: 19},
  center: {textAlign: 'center'},
  grow: {flex: 1, minWidth: 0},
  columns: {flexDirection: 'row', alignItems: 'flex-start'},
  column: {minWidth: 0},
  wideColumn: {flex: 1},
  card: {borderRadius: theme.r1, padding: 16, gap: 8, minWidth: 0},
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 52,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: theme.r2,
    borderWidth: 1,
  },
  primaryButton: {backgroundColor: theme.paddy, borderColor: theme.paddy},
  secondaryButton: {
    backgroundColor: theme.surface,
    borderColor: theme.hairline,
  },
  ghostButton: {backgroundColor: 'transparent', borderColor: 'transparent'},
  pressed: {opacity: 0.76},
  disabled: {opacity: 0.52},
  iconButton: {
    width: theme.hit,
    height: theme.hit,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldGroup: {gap: 5, minWidth: 0},
  fieldLabel: {fontFamily: theme.font.semi},
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderRadius: theme.r3,
    minHeight: 48,
    backgroundColor: theme.surface,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    width: '100%',
    minWidth: 0,
    color: theme.ink,
    fontFamily: theme.font.regular,
    fontSize: theme.fs5,
    minHeight: 46,
    paddingVertical: 10,
  },
  multiline: {minHeight: 94, textAlignVertical: 'top'},
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    minHeight: 48,
    borderRadius: theme.r3,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.overlay,
  },
  dialog: {
    backgroundColor: theme.surface,
    borderRadius: theme.r1,
    padding: 16,
    gap: 8,
    width: '100%',
    maxWidth: 430,
    maxHeight: '75%',
  },
  dialogHeading: {flexDirection: 'row', alignItems: 'center', gap: 12},
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 4,
    gap: 3,
    borderRadius: theme.r3,
    backgroundColor: theme.recessed,
  },
  tab: {
    flexGrow: 1,
    flexBasis: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRadius: 9,
  },
  activeTab: {backgroundColor: theme.surface},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.hit,
    gap: 10,
    paddingVertical: 7,
  },
  shell: {flex: 1, flexDirection: 'row', backgroundColor: theme.canvas},
  scroll: {flexGrow: 1},
  stack: {minWidth: 0},
  regularContent: {paddingHorizontal: 32},
  compactContent: {paddingHorizontal: 20},
  navigationContent: {paddingBottom: 16},
  content: {width: '100%', alignSelf: 'center', gap: 16},
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: theme.hit,
  },
  footer: {
    backgroundColor: theme.surface,
    borderTopColor: theme.hairline,
    borderTopWidth: 1,
  },
  ask: {paddingHorizontal: 20, paddingVertical: 12, minHeight: 69},
  bottomNav: {
    flexDirection: 'row',
    borderTopColor: theme.hairline,
    borderTopWidth: 1,
  },
  bottomLink: {
    flex: 1,
    minWidth: 0,
    minHeight: 57,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 1,
    paddingVertical: 6,
  },
  sidebar: {
    width: 228,
    backgroundColor: theme.surface,
    borderRightColor: theme.hairline,
    borderRightWidth: 1,
    padding: 16,
    paddingTop: 36,
    gap: 18,
  },
  brand: {paddingHorizontal: 12},
  sideLinks: {gap: 4},
  sideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: theme.hit,
    borderRadius: theme.r3,
    paddingHorizontal: 12,
    gap: 12,
  },
  activeSide: {backgroundColor: theme.paddySoft},
  sideAsk: {
    borderTopColor: theme.hairline,
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 14,
  },
});
