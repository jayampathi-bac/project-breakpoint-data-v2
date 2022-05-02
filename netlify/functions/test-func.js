exports.handler = async (event, context) => {
    const name = event.queryStringParameters.name || "World";

    let i = 0;
    function onTimer() {
        i++;
        if (i > 61) {
            console.log(' timeout over')
        }
        else {
            console.log('timout ',i)
            setTimeout(onTimer, 1000);
        }
    }

    onTimer()

    return {
        statusCode: 200,
        body: `Hello, ${name}`,
    };
};