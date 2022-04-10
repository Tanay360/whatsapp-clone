<script lang="ts">
    export default {

    }
</script>

<template>
    <main>
        <v-card elevation="2" outlined dark class="card-404">
            <h1>404</h1>
            <span style="margin-top: 5px;">There's nothing here!</span>
            <a class="navigation" href="/"> <v-icon>mdi-arrow-left</v-icon> <span>Navigate to home</span></a>
        </v-card>
    </main>
</template>

<style scoped>
    main {
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;

        text-align: center;
    }
    .card-404 {
        padding: 50px;
        display: flex;
        flex-direction: column;
        min-width: 30%;
    }

    a.navigation {
        margin-top: 10px;
        font-size: 1rem;
        color: white;
        text-decoration: none;
    }
    a:visited {
        color: white;
    }
    a span:hover {
        text-decoration: underline;
    }
</style>