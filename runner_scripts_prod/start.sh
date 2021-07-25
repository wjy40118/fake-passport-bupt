docker run \
    -p 10985:10985 \
    --name "fake-passport-bupt" \
    --network "traefik-global-proxy" \
    --label "traefik.enable=true" \
    --label "traefik.http.routers.fake-passport-bupt.rule=Host(\`fake-passport-bupt.charlie0129.top\`)" \
    --label "traefik.http.servicesfake-passport-bupt.loadbalancer.server.port=10985"\
    charlie0129/fake-passport-bupt
