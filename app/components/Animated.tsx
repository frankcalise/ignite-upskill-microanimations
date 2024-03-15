import React, { FC, ComponentClass } from "react"
import Animated from "react-native-reanimated"

const wrapFunctionComponent = <TProps,>(Component: FC<TProps>): ComponentClass<TProps> =>
  class extends React.Component<TProps> {
    constructor(props: TProps) {
      super(props)
    }

    render() {
      return <Component {...this.props} />
    }
  }

export const createAnimatedFunctionComponent = <TProps,>(Component: FC<TProps>) =>
  Animated.createAnimatedComponent(wrapFunctionComponent(Component))
