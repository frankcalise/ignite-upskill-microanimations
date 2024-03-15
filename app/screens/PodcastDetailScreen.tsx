import { observer } from "mobx-react-lite"
import React, { FC, useMemo } from "react"
import {
  ImageSourcePropType,
  ImageStyle,
  ScrollView,
  TextStyle,
  View,
  ViewStyle,
  useWindowDimensions,
  StyleSheet,
} from "react-native"
import RenderHtml from "react-native-render-html"
import { BlurView } from "expo-blur"
import { Button, Card, Text } from "../components"

import { colors, spacing } from "../theme"

import { AppStackScreenProps } from "app/navigators"
import { useAppNavigation } from "app/utils/useAppNavigation"
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import { openLinkInBrowser } from "app/utils/openLinkInBrowser"

const rnrImage1 = require("../../assets/images/demo/rnr-image-1.png")
const rnrImage2 = require("../../assets/images/demo/rnr-image-2.png")
const rnrImage3 = require("../../assets/images/demo/rnr-image-3.png")
const rnrImages = [rnrImage1, rnrImage2, rnrImage3]

export const PodcastDetailScreen: FC<AppStackScreenProps<"PodcastDetail">> = observer(
  function PodcastDetailScreen(_props) {
    const { route } = _props
    const { episode, tag } = route.params
    const { height, width } = useWindowDimensions()
    const navigation = useAppNavigation()

    const imageUri = useMemo<ImageSourcePropType>(() => {
      return rnrImages[Math.floor(Math.random() * rnrImages.length)]
    }, [])

    const goBack = React.useCallback(() => {
      navigation.navigate("DemoPodcastList")
    }, [navigation])

    const imageSize = width * 0.25

    const offset = useSharedValue({ x: 0, y: 0 })

    const scale = useDerivedValue(() => {
      const y = Math.abs(offset.value.y)

      return Math.max(1 - y / height, 0.5)
    }, [height])

    // TODO doesn't seem to rerender the BlurView with less intensity
    const blurAmount = useDerivedValue(() => {
      console.log("scale.value", 25 - scale.value * 25)
      return scale.value * 25
    }, [scale])

    const translation = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: offset.value.x * 0.3 },
          { translateY: offset.value.y * 0.3 },
          {
            scale: scale.value,
          },
        ],
      }
    })

    console.log(episode.description)

    const source = { html: `${episode.description}` }

    const pan = Gesture.Pan()
      .onChange((e) => {
        offset.value = {
          x: e.changeX + offset.value.x,
          y: e.changeY + offset.value.y,
        }
        if (Math.abs(offset.value.x) > 150 || Math.abs(offset.value.y) > 250) {
          runOnJS(goBack)()
        }
      })
      .onFinalize(() => {
        offset.value = withSpring(
          { x: 0, y: 0 },
          {
            mass: 0.5,
          },
        )
      })

    return (
      <>
        <BlurView
          intensity={blurAmount.value}
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />
        <View style={$container}>
          <GestureDetector gesture={pan}>
            <Animated.View style={translation}>
              <Card
                style={$item}
                verticalAlignment="force-footer-bottom"
                HeadingComponent={
                  <View>
                    <Animated.Image
                      source={imageUri}
                      resizeMode="cover"
                      style={[$itemThumbnail, { height: imageSize, width: imageSize }]}
                      sharedTransitionTag={tag}
                    />
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
                  </View>
                }
                // content={`${episode.parsedTitleAndSubtitle.title} - ${episode.parsedTitleAndSubtitle.subtitle}`}
                ContentComponent={
                  <View>
                    <ScrollView
                      style={{ maxHeight: height / 2, width: "100%", marginBottom: spacing.md }}
                    >
                      <Text preset="heading" text={episode.parsedTitleAndSubtitle.subtitle} />
                      <Text preset="subheading" text={episode.parsedTitleAndSubtitle.title} />
                      <RenderHtml contentWidth={width - spacing.xxxl * 2} source={source} />
                      {/* <Text text={episode.description} /> */}
                    </ScrollView>
                  </View>
                }
                FooterComponent={
                  <Button
                    preset="reversed"
                    onPress={() => {
                      openLinkInBrowser(episode.enclosure.link)
                    }}
                    text="Play Episode"
                  />
                }
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </>
    )
  },
)

const $container: ViewStyle = {
  flex: 1,
  // backgroundColor: ,
  marginVertical: spacing.xxxl,
  marginHorizontal: spacing.xl,
}
const $item: ViewStyle = {
  padding: spacing.md,
  minHeight: 120,
  // maxHeight: Dimensions.get("window").height * 0.8,
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

const $itemThumbnail: ImageStyle = {
  marginTop: spacing.sm,
  borderRadius: 50,
  alignSelf: "center",
}
