<template>
  <div class="h-screen flex flex-col">
    <header
      class="h-12 bg-gray-800 text-white flex items-center px-2 sm:px-4 shrink-0 overflow-x-auto"
    >
      <h1 class="text-sm sm:text-lg font-semibold shrink-0">Listen English</h1>
      <nav class="ml-3 sm:ml-8 flex gap-2 sm:gap-4 shrink-0">
        <router-link
          to="/listening"
          class="text-xs sm:text-sm hover:text-blue-300 transition-colors whitespace-nowrap"
          >Listening</router-link
        >
        <router-link
          to="/vocabulary"
          class="hidden sm:inline text-xs sm:text-sm hover:text-blue-300 transition-colors whitespace-nowrap"
          >Vocabulary</router-link
        >
        <router-link
          to="/translation"
          class="hidden sm:inline text-xs sm:text-sm hover:text-blue-300 transition-colors whitespace-nowrap"
          >Translation</router-link
        >
        <router-link
          to="/grammar"
          class="text-xs sm:text-sm hover:text-blue-300 transition-colors whitespace-nowrap"
          >Grammar</router-link
        >
      </nav>
    </header>
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
