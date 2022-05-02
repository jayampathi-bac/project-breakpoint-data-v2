exports.handler = async (event, context) => {
    const name = event.queryStringParameters.name || "World";

    let i = 0;
    function onTimer() {
        i++;
        if (i > 60) {
            console.log(' timeout over')
            return {
                statusCode: 200,
                body: `Hello, ${name} timout over`,
            };
        }
        else {
            console.log('timout ',i)
            setTimeout(onTimer, 1000);
        }
    }

    onTimer()
};