<template>
  <div class="h-screen flex flex-col">
    <header class="h-12 bg-gray-800 text-white flex items-center px-4 shrink-0">
      <h1 class="text-lg font-semibold">Listen English</h1>
      <nav class="ml-8 flex gap-4">
        <router-link to="/listening" class="hover:text-blue-300 transition-colors"
          >Listening</router-link
        >
        <router-link to="/vocabulary" class="hover:text-blue-300 transition-colors"
          >Vocabulary</router-link
        >
        <router-link to="/translation" class="hover:text-blue-300 transition-colors"
          >Translation</router-link
        >
        <router-link to="/grammar" class="hover:text-blue-300 transition-colors"
          >Grammar</router-link
        >
      </nav>
    </header>
    <main class="flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</template>
