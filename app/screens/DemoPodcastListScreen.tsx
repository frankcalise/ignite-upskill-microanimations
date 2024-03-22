import { observer } from "mobx-react-lite"
import React, { ComponentType, FC, useEffect, useMemo } from "react"
import {
  AccessibilityProps,
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  ImageStyle,
  Platform,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native"
import { type ContentStyle } from "@shopify/flash-list"
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import {
  Button,
  ButtonAccessoryProps,
  Card,
  EmptyState,
  Icon,
  ListView,
  Screen,
  Text,
  Toggle,
  createAnimatedFunctionComponent,
} from "../components"
import { isRTL, translate } from "../i18n"
import { useStores } from "../models"
import { Episode } from "../models/Episode"
import { DemoTabScreenProps } from "../navigators/DemoNavigator"
import { colors, spacing } from "../theme"
import { delay } from "../utils/delay"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { setStatusBarStyle } from "expo-status-bar"
import * as Haptics from "expo-haptics"
import { useAppNavigation } from "app/utils/useAppNavigation"

const ICON_SIZE = 14

const rnrImage1 = require("../../assets/images/demo/rnr-image-1.png")
const rnrImage2 = require("../../assets/images/demo/rnr-image-2.png")
const rnrImage3 = require("../../assets/images/demo/rnr-image-3.png")
const rnrImages = [rnrImage1, rnrImage2, rnrImage3]

const CARD_HEIGHT = 120

const AnimatedListView = Animated.createAnimatedComponent(ListView)
const AnimatedText = createAnimatedFunctionComponent(Text)

export const DemoPodcastListScreen: FC<DemoTabScreenProps<"DemoPodcastList">> = observer(
  function DemoPodcastListScreen(_props) {
    const { episodeStore } = useStores()

    const [refreshing, setRefreshing] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(false)

    // initially, kick off a background refresh without the refreshing UI
    useEffect(() => {
      ;(async function load() {
        setIsLoading(true)
        await episodeStore.fetchEpisodes()
        setIsLoading(false)
      })()
    }, [episodeStore])

    // simulate a longer refresh, if the refresh is too fast for UX
    async function manualRefresh() {
      setRefreshing(true)
      await Promise.all([episodeStore.fetchEpisodes(), delay(750)])
      setRefreshing(false)
    }

    const scrollY = useSharedValue(0)
    const dimensions = useWindowDimensions()
    const insets = useSafeAreaInsets()
    const expandMode = useSharedValue(false)

    const scrollHandler = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollY.value = event.contentOffset.y
        if (event.contentOffset.y >= 45 && !expandMode.value) {
          expandMode.value = true
          runOnJS(setStatusBarStyle)("light")
        }
        if (event.contentOffset.y < 45 && expandMode.value) {
          expandMode.value = false
          runOnJS(setStatusBarStyle)("auto")
        }
      },
    })

    const $headerContainerStyle = useAnimatedStyle(() => ({
      top: Math.max(0, -scrollY.value),
    }))
    const $headerCardWrapperStyle = useAnimatedStyle(() => ({
      paddingHorizontal: interpolate(scrollY.value, [0, 80], [spacing.xs, 0], Extrapolation.CLAMP),
    }))

    const $headerCardStyle = useAnimatedStyle(() => {
      const borderRadius = interpolate(
        scrollY.value,
        [60, 80],
        [spacing.lg, 0],
        Extrapolation.CLAMP,
      )
      return {
        backgroundColor: interpolateColor(
          scrollY.value,
          [0, 80],
          ["transparent", colors.palette.secondary400],
        ),
        borderTopLeftRadius: borderRadius,
        borderTopRightRadius: borderRadius,
        height: interpolate(
          scrollY.value,
          [0, 80],
          [CARD_HEIGHT, CARD_HEIGHT + insets.top],
          Extrapolation.CLAMP,
        ),
      }
    })

    const $headerTitleStyle = useAnimatedStyle(() => {
      return {
        color: interpolateColor(
          scrollY.value,
          [0, 80],
          [colors.palette.neutral900, colors.palette.neutral100],
        ),
      }
    })

    return (
      <Screen preset="fixed" contentContainerStyle={$screenContentContainer}>
        <AnimatedListView<Episode>
          contentContainerStyle={$listContentContainer}
          data={episodeStore.episodesForList.slice()}
          extraData={episodeStore.favorites.length + episodeStore.episodes.length}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          estimatedItemSize={177}
          onRefresh={manualRefresh}
          onScroll={scrollHandler}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator />
            ) : (
              <Animated.View entering={FadeIn.duration(350)}>
                <EmptyState
                  preset="generic"
                  style={$emptyState}
                  headingTx={
                    episodeStore.favoritesOnly
                      ? "demoPodcastListScreen.noFavoritesEmptyState.heading"
                      : undefined
                  }
                  contentTx={
                    episodeStore.favoritesOnly
                      ? "demoPodcastListScreen.noFavoritesEmptyState.content"
                      : undefined
                  }
                  button={episodeStore.favoritesOnly ? "" : undefined}
                  buttonOnPress={manualRefresh}
                  imageStyle={$emptyStateImage}
                  ImageProps={{ resizeMode: "contain" }}
                />
              </Animated.View>
            )
          }
          ListHeaderComponent={
            <>
              <View style={{ height: CARD_HEIGHT }} />
              {(episodeStore.favoritesOnly || episodeStore.episodesForList.length > 0) && (
                <View style={$toggle}>
                  <Toggle
                    value={episodeStore.favoritesOnly}
                    onValueChange={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                      episodeStore.setProp("favoritesOnly", !episodeStore.favoritesOnly)
                    }}
                    variant="switch"
                    labelTx="demoPodcastListScreen.onlyFavorites"
                    labelPosition="left"
                    labelStyle={$labelStyle}
                    accessibilityLabel={translate("demoPodcastListScreen.accessibility.switch")}
                  />
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <EpisodeCard
              episode={item}
              isFavorite={episodeStore.hasFavorite(item)}
              onPressFavorite={() => episodeStore.toggleFavorite(item)}
            />
          )}
        />
        {/* Animated header */}
        <Animated.View style={[$headerContainer, $headerContainerStyle]}>
          <Animated.View
            style={[
              $headerWrapper,
              { width: dimensions.width, height: CARD_HEIGHT + insets.top },
              $headerCardWrapperStyle,
            ]}
          >
            <Animated.View style={[$card, $headerCardStyle]}>
              <AnimatedText
                preset="heading"
                tx="demoPodcastListScreen.title"
                style={$headerTitleStyle}
              />
            </Animated.View>
          </Animated.View>
          {/* <Animated.View
            style={[
              $headerWrapper,
              { width: dimensions.width, height: CARD_HEIGHT + insets.top },
              $headerCardWrapperStyle,
            ]}
          >
            <Animated.View style={[$card, { backgroundColor: "red" }, $headerCardStyle]}>
              <View style={[$cardCircle, { backgroundColor: "red" }]} />
              <Text style={[$cardTitle, { color: "white" }]}>Current Balance</Text>
            </Animated.View>
          </Animated.View> */}
        </Animated.View>
      </Screen>
    )
  },
)

const EpisodeCard = observer(function EpisodeCard({
  episode,
  isFavorite,
  onPressFavorite,
}: {
  episode: Episode
  onPressFavorite: () => void
  isFavorite: boolean
}) {
  const liked = useSharedValue(isFavorite ? 1 : 0)
  const navigation = useAppNavigation()

  const imageUri = useMemo<ImageSourcePropType>(() => {
    return rnrImages[Math.floor(Math.random() * rnrImages.length)]
  }, [])

  // Grey heart
  const animatedLikeButtonStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(liked.value, [0, 1], [1, 0], Extrapolation.EXTEND),
        },
      ],
      opacity: interpolate(liked.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    }
  })

  // Pink heart
  const animatedUnlikeButtonStyles = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: liked.value,
        },
      ],
      opacity: liked.value,
    }
  })

  /**
   * Android has a "longpress" accessibility action. iOS does not, so we just have to use a hint.
   * @see https://reactnative.dev/docs/accessibility#accessibilityactions
   */
  const accessibilityHintProps = useMemo(
    () =>
      Platform.select<AccessibilityProps>({
        ios: {
          accessibilityLabel: episode.title,
          accessibilityHint: translate("demoPodcastListScreen.accessibility.cardHint", {
            action: isFavorite ? "unfavorite" : "favorite",
          }),
        },
        android: {
          accessibilityLabel: episode.title,
          accessibilityActions: [
            {
              name: "longpress",
              label: translate("demoPodcastListScreen.accessibility.favoriteAction"),
            },
          ],
          onAccessibilityAction: ({ nativeEvent }) => {
            if (nativeEvent.actionName === "longpress") {
              handlePressFavorite()
            }
          },
        },
      }),
    [episode, isFavorite],
  )

  const handlePressFavorite = () => {
    Haptics.selectionAsync()
    onPressFavorite()
    liked.value = withSpring(liked.value ? 0 : 1)
  }

  const handlePressCard = () => {
    Haptics.selectionAsync()
    navigation.navigate("PodcastDetail", { episode })
  }

  const ButtonLeftAccessory: ComponentType<ButtonAccessoryProps> = useMemo(
    () =>
      function ButtonLeftAccessory() {
        return (
          <View>
            <Animated.View
              style={[$iconContainer, StyleSheet.absoluteFill, animatedLikeButtonStyles]}
            >
              <Icon
                icon="heart"
                size={ICON_SIZE}
                color={colors.palette.neutral800} // dark grey
              />
            </Animated.View>
            <Animated.View style={[$iconContainer, animatedUnlikeButtonStyles]}>
              <Icon
                icon="heart"
                size={ICON_SIZE}
                color={colors.palette.primary400} // pink
              />
            </Animated.View>
          </View>
        )
      },
    [],
  )

  return (
    <Card
      style={$item}
      verticalAlignment="force-footer-bottom"
      onPress={handlePressCard}
      onLongPress={handlePressFavorite}
      HeadingComponent={
        <View style={$metadata}>
          <Text
            style={$metadataText}
            size="xxs"
            accessibilityLabel={episode.datePublished.accessibilityLabel}
          >
            {episode.datePublished.textLabel}
          </Text>
          <Text
            style={$metadataText}
            size="xxs"
            accessibilityLabel={episode.duration.accessibilityLabel}
          >
            {episode.duration.textLabel}
          </Text>
        </View>
      }
      content={`${episode.parsedTitleAndSubtitle.title} - ${episode.parsedTitleAndSubtitle.subtitle}`}
      {...accessibilityHintProps}
      RightComponent={
        <Animated.Image
          source={imageUri}
          style={$itemThumbnail}
          sharedTransitionTag={episode.guid}
        />
      }
      FooterComponent={
        <Button
          onPress={handlePressFavorite}
          onLongPress={handlePressFavorite}
          style={[$favoriteButton, isFavorite && $unFavoriteButton]}
          accessibilityLabel={
            isFavorite
              ? translate("demoPodcastListScreen.accessibility.unfavoriteIcon")
              : translate("demoPodcastListScreen.accessibility.favoriteIcon")
          }
          LeftAccessory={ButtonLeftAccessory}
        >
          <Text
            size="xxs"
            accessibilityLabel={episode.duration.accessibilityLabel}
            weight="medium"
            text={
              isFavorite
                ? translate("demoPodcastListScreen.unfavoriteButton")
                : translate("demoPodcastListScreen.favoriteButton")
            }
          />
        </Button>
      }
    />
  )
})

// #region Styles
const $screenContentContainer: ViewStyle = {
  flex: 1,
}

const $listContentContainer: ContentStyle = {
  paddingHorizontal: spacing.lg,
  paddingTop: spacing.lg + spacing.xl,
  paddingBottom: spacing.lg,
}

const $heading: ViewStyle = {
  marginBottom: spacing.md,
}

const $item: ViewStyle = {
  padding: spacing.md,
  marginTop: spacing.md,
  minHeight: 120,
}

const $itemThumbnail: ImageStyle = {
  marginTop: spacing.sm,
  borderRadius: 50,
  alignSelf: "flex-start",
}

const $toggle: ViewStyle = {
  marginTop: spacing.md,
}

const $labelStyle: TextStyle = {
  textAlign: "left",
}

const $iconContainer: ViewStyle = {
  height: ICON_SIZE,
  width: ICON_SIZE,
  flexDirection: "row",
  marginEnd: spacing.sm,
}

const $metadata: TextStyle = {
  color: colors.textDim,
  marginTop: spacing.xs,
  flexDirection: "row",
}

const $metadataText: TextStyle = {
  color: colors.textDim,
  marginEnd: spacing.md,
  marginBottom: spacing.xs,
}

const $favoriteButton: ViewStyle = {
  borderRadius: 17,
  marginTop: spacing.md,
  justifyContent: "flex-start",
  backgroundColor: colors.palette.neutral300,
  borderColor: colors.palette.neutral300,
  paddingHorizontal: spacing.md,
  paddingTop: spacing.xxxs,
  paddingBottom: 0,
  minHeight: 32,
  alignSelf: "flex-start",
}

const $unFavoriteButton: ViewStyle = {
  borderColor: colors.palette.primary100,
  backgroundColor: colors.palette.primary100,
}

const $emptyState: ViewStyle = {
  marginTop: spacing.xxl,
}

const $emptyStateImage: ImageStyle = {
  transform: [{ scaleX: isRTL ? -1 : 1 }],
}

const $headerContainer: ViewStyle = {
  position: "absolute",
  left: 0,
  right: 0,
}

const $headerWrapper: ViewStyle = {
  justifyContent: "flex-end",
}

const $card: ViewStyle = {
  justifyContent: "flex-end",
  padding: spacing.md,
  position: "relative",
  overflow: "hidden",
  borderRadius: 24,
}
// #endregion
