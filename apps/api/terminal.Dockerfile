FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

RUN apt-get update && apt-get install -y \
    bash \
    zsh \
    git \
    vim \
    nano \
    curl \
    wget \
    htop \
    tree \
    jq \
    python3 \
    python3-pip \
    nodejs \
    npm \
    unzip \
    locales \
    fonts-powerline \
    && rm -rf /var/lib/apt/lists/*

RUN locale-gen en_US.UTF-8

RUN useradd -m -d /workspace -s /bin/zsh -u 1000 workspace && \
    rm -rf /home/workspace || true

WORKDIR /workspace

USER root

RUN git clone --depth 1 https://github.com/ohmyzsh/ohmyzsh.git /opt/oh-my-zsh && \
    git clone --depth 1 https://github.com/zsh-users/zsh-autosuggestions /opt/oh-my-zsh/custom/plugins/zsh-autosuggestions && \
    git clone --depth 1 https://github.com/zsh-users/zsh-syntax-highlighting.git /opt/oh-my-zsh/custom/plugins/zsh-syntax-highlighting && \
    git clone --depth 1 https://github.com/junegunn/fzf.git /opt/fzf && \
    cd /opt/fzf && \
    ./install --all --no-bash --no-fish && \
    chown -R workspace:workspace /opt/oh-my-zsh /opt/fzf

USER root

RUN echo '#!/bin/bash' > /entrypoint.sh && \
    echo 'if [ ! -d /workspace/.oh-my-zsh ]; then' >> /entrypoint.sh && \
    echo '  cp -r /opt/oh-my-zsh /workspace/.oh-my-zsh' >> /entrypoint.sh && \
    echo '  chown -R workspace:workspace /workspace/.oh-my-zsh' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'if [ ! -d /workspace/.fzf ]; then' >> /entrypoint.sh && \
    echo '  cp -r /opt/fzf /workspace/.fzf' >> /entrypoint.sh && \
    echo '  chown -R workspace:workspace /workspace/.fzf' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'if [ ! -f /workspace/.zshrc ] || ! grep -q "oh-my-zsh" /workspace/.zshrc; then' >> /entrypoint.sh && \
    echo '  echo "export ZSH=\"\$HOME/.oh-my-zsh\"" > /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  echo "ZSH_THEME=\"random\"" >> /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  echo "plugins=(git fzf zsh-autosuggestions zsh-syntax-highlighting)" >> /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  echo "source \$ZSH/oh-my-zsh.sh" >> /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  echo "[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh" >> /workspace/.zshrc' >> /entrypoint.sh && \
    echo '  chown workspace:workspace /workspace/.zshrc' >> /entrypoint.sh && \
    echo 'fi' >> /entrypoint.sh && \
    echo 'exec "$@"' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["tail", "-f", "/dev/null"]

