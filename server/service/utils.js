const SHOW_LOG = process.env.SHOW_LOG || true
const LOG_REPLY = true
const LOG_HEART = false
const LOG_COMMU = false
const LOG_SESSI = false
const LOG_MATCH = true

export const print_log = (string, mod = -1) => {
    if (SHOW_LOG) {
        switch (mod) {
            case 1:
                if (LOG_REPLY) {
                    console.log(string);
                } 
                break;
            case 2:
                if (LOG_HEART) {
                    console.log(string);
                }
                break;
            case 3:
                if (LOG_COMMU) {
                    console.log(string);
                }
                break;
            case 4:
                if (LOG_SESSI) {
                    console.log(string);
                }
                break;
            case 5:
                if (LOG_MATCH) {
                    console.log(string);
                }
                break;
            default:
                console.log(string);
        }        
    }
}

print_log('reply log on', 1);
print_log('heart log on', 2);
print_log('communication log on', 3);
print_log('session log on', 4);
