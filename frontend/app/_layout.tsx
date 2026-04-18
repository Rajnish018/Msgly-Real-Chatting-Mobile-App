import { AuthProvider } from "@/context/authContext";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const Stacklayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
    
      {/* 1st Screen page */}
      <Stack.Screen name="index"/>

      <Stack.Screen
        name="(main)/profileModal"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
        }}
      />
      <Stack.Screen
        name="(main)/newConversationModal"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

    </Stack>
  );
};

export default function Rootlayout() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stacklayout />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
